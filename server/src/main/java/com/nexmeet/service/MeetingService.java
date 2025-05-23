package com.nexmeet.service;

import com.nexmeet.dto.*;
import com.nexmeet.model.*;
import com.nexmeet.repository.MeetingRepository;
import com.nexmeet.repository.ParticipantRepository;
import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.MeetingCodeGenerator;
import org.springframework.http.HttpStatusCode;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public MeetingService(
            MeetingRepository meetingRepository, 
            UserRepository userRepository, 
            ParticipantRepository participantRepository,
            MediaSoupService mediaSoupService,
            SimpMessagingTemplate messagingTemplate) {
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
        this.participantRepository = participantRepository;
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
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
        return new GetMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), meeting.getMediaRoomId(), isHost);
    }

    @Transactional
    public CreateMeetingResponse createMeeting(CreateMeetingRequest request, String userEmail) {
        User host = userRepository.findByEmail(userEmail).orElseThrow(
                () -> new RuntimeException("Host not found")
        );

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
                "hostName", host.getName()
            )
        );

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), "Meeting created");
    }

    @Transactional
    public JoinMeetingResponse askToJoinMeeting(String code, String userEmail) {
        Optional<Meeting> meetingOpt = meetingRepository.findByCode(code);
        // Check if the meeting exists or not
        if(meetingOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }
        
        Meeting meeting = meetingOpt.get();

        if (meeting.getHost().getEmail().equals(userEmail)) {
            // For host: automatically join the MediaSoup room
            User host = meeting.getHost();
            MediaSoupService.User mediaUser = new MediaSoupService.User(
                host.getId().toString(),
                host.getName()
            );
            
            try {
                mediaSoupService.joinRoom(meeting.getMediaRoomId(), mediaUser);
                
                // Notify others that host has joined
                messagingTemplate.convertAndSend(
                    "/topic/room/" + meeting.getCode(),
                    Map.of(
                        "type", "HOST_JOINED",
                        "userId", host.getId().toString(),
                        "name", host.getName()
                    )
                );
            } catch (Exception e) {
                // Log error but allow host to join anyway
                // This prevents MediaSoup issues from blocking meeting access
            }
            
            return new JoinMeetingResponse(meeting.getCode(), meeting.getStatus(), ParticipantStatus.ACCEPTED, null);
        }
        
        // If participant: create participant record and notify host
        User user = userRepository.findByEmail(userEmail).orElseThrow(
            () -> new ResponseStatusException(HttpStatusCode.valueOf(404), "User not found")
        );

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
                "userEmail", userEmail
            )
        );

        return new JoinMeetingResponse(meeting.getCode(), meeting.getStatus(), participant.getStatus(), participant.getId());
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
            user.getName()
        );
        
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
                "mediaRoomId", meeting.getMediaRoomId()
            )
        );
        
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
                "isPinned", false
            )
        );

        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }

    @Transactional
    public AskToJoinMeetingResponse rejectMeeting(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403),"You are not the host of the meeting");
        }
        
        Participant participant = participantRepository.findById(UUID.fromString(participantId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404),"Participant not found"));
        
        participant.setStatus(ParticipantStatus.REJECTED);
        participantRepository.save(participant);
        
        // Notify participant they've been rejected
        User user = participant.getUser();
        messagingTemplate.convertAndSendToUser(
            user.getEmail(),
            "/queue/meeting-updates",
            Map.of(
                "type", "JOIN_REJECTED",
                "meetingCode", code
            )
        );
        
        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }

    @Transactional
    public CreateMeetingResponse endMeeting(String code, String userEmail) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403),"You are not the host of the meeting");
        }

        participantRepository.endMeeting(meeting.getId());
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
                "meetingCode", code
            )
        );

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
                "userId", userId.toString()
            )
        );

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), "Participant left the meeting");
    }

    @Transactional
    public CreateMeetingResponse kickParticipant(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403),"You are not the host of the meeting");
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
                "userId", participant.getUser().getId().toString()
            )
        );
        
        // Send direct message to kicked participant
        messagingTemplate.convertAndSendToUser(
            participant.getUser().getEmail(),
            "/queue/meeting-updates",
            Map.of(
                "type", "YOU_WERE_KICKED",
                "meetingCode", code
            )
        );

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus(), "Participant kicked from the meeting");
    }

    private Meeting getMeeting(String code) {
        return meetingRepository.findByCode(code)
            .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found"));
    }

    private Participant getParticipant(UUID participantId) {
        return participantRepository.findById(participantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatusCode.valueOf(404), "Participant not found"));
    }
}