package com.nexmeet.service;

import com.nexmeet.dto.*;
import com.nexmeet.model.*;
import com.nexmeet.repository.*;
import com.nexmeet.util.MeetingCodeGenerator;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class MeetingService {
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final ParticipantRepository participantRepository;
    private final MediaSoupService mediaSoupService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RecordingRepository recordingRepository;
    private final SummaryRepository summaryRepository;
    private final TranscriptionRepository transcriptionRepository;

    public MeetingService(
            MeetingRepository meetingRepository,
            UserRepository userRepository,
            ParticipantRepository participantRepository,
            MediaSoupService mediaSoupService,
            SimpMessagingTemplate messagingTemplate, RecordingRepository recordingRepository, SummaryRepository summaryRepository, TranscriptionRepository transcriptionRepository) {
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
        this.participantRepository = participantRepository;
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
        this.recordingRepository = recordingRepository;
        this.summaryRepository = summaryRepository;
        this.transcriptionRepository = transcriptionRepository;
    }

    public Map<String, Meeting> getAllMeetings() {
        Map<String, Meeting> meetings = new HashMap<>();
        meetingRepository.findAll().forEach(meeting -> meetings.put(meeting.getCode(), meeting));
        return meetings;
    }

    public GetMeetingResponse getMeetingByCode(String code, String userEmail) {
        Meeting meeting = meetingRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found"));

        boolean isHost = meeting.getHost().getEmail().equals(userEmail);
        return new GetMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(),
                meeting.getMediaRoomId(), isHost);
    }

    @Transactional
    public CreateMeetingResponse createMeeting(CreateMeetingRequest request, String userEmail) {
        User host = userRepository.findByEmail(userEmail).orElseThrow(
                () -> new RuntimeException("Host not found"));

        Meeting meeting = new Meeting();
        String code = MeetingCodeGenerator.generateMeetingCode();

        System.out.println("Meeting code: " + code);
        // Create MediaSoup room
        String mediaRoomId = mediaSoupService.createRoom();

        System.out.println("Media room ID: " + mediaRoomId);

        meeting.setCode(code);
        meeting.setTitle(request.getTitle() != null ? request.getTitle() : "Instant Meeting");
        meeting.setHost(host);
        meeting.setStartTime(Instant.now());
        meeting.setMediaRoomId(mediaRoomId); // Set the media room ID
        meetingRepository.save(meeting);

        // Notify clients about new meeting
        messagingTemplate.convertAndSend(
                "/topic/meetings",
                Map.of(
                        "type", "MEETING_CREATED",
                        "meetingCode", meeting.getCode(),
                        "mediaRoomId", mediaRoomId,
                        "hostEmail", userEmail,
                        "hostName", host.getName()));

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), "Meeting created");
    }

    @Transactional
    public JoinMeetingResponse askToJoinMeeting(String code, String userEmail) {
        Meeting meeting = getMeeting(code);

        if (meeting.getHost().getEmail().equals(userEmail)) {
            // For host: automatically join the MediaSoup room
            User host = meeting.getHost();
            MediaSoupService.User mediaUser = new MediaSoupService.User(
                    host.getId().toString(),
                    host.getName());

            meeting.setStartTime(Instant.now());
            meeting.setStatus(MeetingStatus.ACTIVE);
            meetingRepository.save(meeting);

            try {
                mediaSoupService.joinRoom(meeting.getMediaRoomId(), mediaUser);

                // Notify others that host has joined
                messagingTemplate.convertAndSend(
                        "/topic/room/" + meeting.getCode(),
                        Map.of(
                                "type", "HOST_JOINED",
                                "userId", host.getId().toString(),
                                "name", host.getName()));
            } catch (Exception e) {
                // Log error but allow host to join anyway
                // This prevents MediaSoup issues from blocking meeting access
            }

            return new JoinMeetingResponse(meeting.getCode(), meeting.getStatus(), ParticipantStatus.ACCEPTED, null);
        }

        // If participant: create participant record and notify host
        User user = userRepository.findByEmail(userEmail).orElseThrow(
                () -> new ResponseStatusException(HttpStatusCode.valueOf(404), "User not found"));

        Participant participant = new Participant();
        participant.setUser(user);
        participant.setMeeting(meeting);
        participant.setStatus(ParticipantStatus.WAITING);
        participantRepository.save(participant);

        // Notify host about join request
        messagingTemplate.convertAndSendToUser(
                meeting.getHost().getEmail(),
                "/queue/join-requests",
                Map.of(
                        "type", "JOIN_REQUEST",
                        "meetingCode", code,
                        "participantId", participant.getId().toString(),
                        "userName", user.getName(),
                        "userEmail", userEmail));

        return new JoinMeetingResponse(meeting.getCode(), meeting.getStatus(), participant.getStatus(),
                participant.getId());
    }

    @Transactional
    public AskToJoinMeetingResponse acceptMeeting(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);

        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        Participant participant = getParticipant(UUID.fromString(participantId));
        participant.setJoinedAt(Instant.now());
        participant.setStatus(ParticipantStatus.ACCEPTED);
        participantRepository.save(participant);

        // Add participant to MediaSoup room
        User user = participant.getUser();
        MediaSoupService.User mediaUser = new MediaSoupService.User(
                user.getId().toString(),
                user.getName());

        try {
            mediaSoupService.joinRoom(meeting.getMediaRoomId(), mediaUser);
        } catch (Exception e) {
            // Log error but continue - don't prevent participant from joining

        }

        // Notify participant that they've been accepted
        messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/meeting-updates",
                Map.of(
                        "type", "JOIN_ACCEPTED",
                        "meetingCode", code,
                        "mediaRoomId", meeting.getMediaRoomId()));

        // Notify all participants about new member
        messagingTemplate.convertAndSend(
                "/topic/room/" + meeting.getCode(),
                Map.of(
                        "type", "PARTICIPANT_JOINED",
                        "participantId", participant.getId().toString(),
                        "userId", user.getId().toString(),
                        "name", user.getName(),
                        "initials", user.getName().substring(0, 1).toUpperCase(),
                        "isMuted", false,
                        "isCameraOff", false,
                        "isScreenSharing", false,
                        "isPinned", false));

        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }

    @Transactional
    public AskToJoinMeetingResponse rejectMeeting(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        Participant participant = participantRepository.findById(UUID.fromString(participantId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Participant not found"));

        participant.setStatus(ParticipantStatus.REJECTED);
        participantRepository.save(participant);

        // Notify participant they've been rejected
        User user = participant.getUser();
        messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/meeting-updates",
                Map.of(
                        "type", "JOIN_REJECTED",
                        "meetingCode", code));

        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }

    @Transactional
    public CreateMeetingResponse endMeeting(String code, String userEmail) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        participantRepository.endMeeting(meeting.getId(), Instant.now());
        meeting.setStatus(MeetingStatus.ENDED);
        meeting.setEndTime(Instant.now());
        meetingRepository.save(meeting);

        // Close MediaSoup room
        try {
            mediaSoupService.closeRoom(meeting.getMediaRoomId());
        } catch (Exception e) {
            // Log error but continue
        }

        // Notify all participants that meeting has ended
        messagingTemplate.convertAndSend(
                "/topic/room/" + meeting.getCode(),
                Map.of(
                        "type", "MEETING_ENDED",
                        "meetingCode", code));

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), "Meeting ended");
    }

    @Transactional
    public CreateMeetingResponse leaveMeeting(String code, UUID userId) {
        Meeting meeting = getMeeting(code);
        Participant participant = getParticipant(userId);
        participant.setLeftAt(Instant.now());
        participantRepository.save(participant);

        // Remove participant from MediaSoup room
        try {
            mediaSoupService.leaveRoom(meeting.getMediaRoomId(), userId.toString());
        } catch (Exception e) {
            // Log error but continue
        }

        // Notify other participants
        messagingTemplate.convertAndSend(
                "/topic/room/" + meeting.getCode(),
                Map.of(
                        "type", "PARTICIPANT_LEFT",
                        "participantId", participant.getId().toString(),
                        "userId", userId.toString()));

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(),
                "Participant left the meeting");
    }

    @Transactional
    public CreateMeetingResponse kickParticipant(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        Participant participant = getParticipant(UUID.fromString(participantId));
        participant.setLeftAt(Instant.now());
        participantRepository.save(participant);

        // Remove participant from MediaSoup room
        try {
            mediaSoupService.leaveRoom(meeting.getMediaRoomId(), participant.getUser().getId().toString());
        } catch (Exception e) {
            // Log error but continue
        }

        // Notify all participants including the kicked one
        messagingTemplate.convertAndSend(
                "/topic/room/" + meeting.getCode(),
                Map.of(
                        "type", "PARTICIPANT_KICKED",
                        "participantId", participant.getId().toString(),
                        "userId", participant.getUser().getId().toString()));

        // Send direct message to kicked participant
        messagingTemplate.convertAndSendToUser(
                participant.getUser().getEmail(),
                "/queue/meeting-updates",
                Map.of(
                        "type", "YOU_WERE_KICKED",
                        "meetingCode", code));

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(),
                "Participant kicked from the meeting");
    }

    private Meeting getMeeting(String code) {
        return meetingRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found"));
    }

    private Participant getParticipant(UUID participantId) {
        return participantRepository.findById(participantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Participant not found"));
    }

    @Transactional
    public ResponseEntity<Map<String, Object>> uploadRecording(@RequestBody Map<String, Object> request,
            String accessToken) {
        try {
            // Validate access token
            if (accessToken == null) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Invalid access token");
            }

            // Extract request parameters
            String url = (String) request.get("url");
            String meetingCode = (String) request.get("meetingCode");
            String participantId = (String) request.get("participantId");
            String recordingType = (String) request.get("recordingType");

            // Validate required fields
            if (url == null || url.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(400), "URL is required");
            }

            if (meetingCode == null || meetingCode.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(400), "meetingCode is required");
            }

            if (participantId == null || participantId.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(400), "participantId is required");
            }

            // Find the meeting by code
            Optional<Meeting> meeting = meetingRepository.findByCode(meetingCode);
            if (meeting.isEmpty()) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
            }

            // Create recording entity and save to database
            Recording recording = new Recording();
            recording.setMeeting(meeting.get());
            recording.setUrl(url);

            // Save recording to database
            Recording savedRecording = recordingRepository.save(recording);

            System.out.printf(
                    "Recording saved - Meeting: %s, Participant: %s, URL: %s, Type: %s%n",
                    meetingCode, participantId, url, recordingType);

            // Prepare success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Recording saved successfully");
            response.put("recordingId", savedRecording.getId());
            response.put("meetingCode", meetingCode);
            response.put("url", url);
            response.put("recordingType", recordingType);

            // Optionally notify other participants about the new recording
            try {
                String notification = "New recording saved for meeting: " + meetingCode;

                messagingTemplate.convertAndSend("/topic/meeting/" + meetingCode, Map.of(
                        "type", "RECORDING_SAVED"));
                System.out.println("Notified participants about new recording for meeting: " + meetingCode);
            } catch (Exception e) {
                System.err.println("Error notifying participants about recording: " + e.getMessage());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error saving recording: " + e.getMessage());
            e.printStackTrace();

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to save recording: " + e.getMessage());

            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @Transactional
    public ResponseEntity<Map<String, Object>> deleteSummary(String summaryId, UUID userId){
        Optional<Summary> summary = summaryRepository.findById(UUID.fromString(summaryId));
        if (summary.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Summary not found");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "User not found"));
        if (user.getId() == summary.get().getMeeting().getHost().getId()){
            summaryRepository.delete(summary.get());
        }
        else {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    @Transactional
    public ResponseEntity<Map<String, Object>> deleteTranscription(String transcriptionId, UUID userId){
        Optional<Transcription> transcription = transcriptionRepository.findById(UUID.fromString(transcriptionId));
        if (transcription.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Transcription not found");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "User not found"));
        if (user.getId() == transcription.get().getMeeting().getHost().getId()) {
            transcriptionRepository.delete(transcription.get());
        }
        else {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    @Transactional
    public ResponseEntity<Map<String, Object>> deleteMeeting(String meetingId, UUID userId){
        Optional<Meeting> meeting = meetingRepository.findById(UUID.fromString(meetingId));

        if (meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "User not found"));
        if (user.getId() == meeting.get().getHost().getId()) {

            meeting.get().setMarkedAsDeleted(true);
            meetingRepository.save(meeting.get());
        }
        else {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403), "You are not the host of the meeting");
        }

        return ResponseEntity.ok(Map.of("success", true));
    }
}