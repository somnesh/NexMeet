package com.nexmeet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexmeet.dto.*;
import com.nexmeet.model.*;
import com.nexmeet.repository.*;
import com.nexmeet.service.ExternalApiService;
import com.nexmeet.service.MediaSoupService;
import com.nexmeet.service.MeetingService;
import com.nexmeet.util.JwtUtil;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

import java.util.*;

@RestController
@RequestMapping("/api/meeting")
public class MeetingController {

    private final MeetingService meetingService;
    private final MediaSoupService mediaSoupService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final MeetingRepository meetingRepository;
    private final RecordingRepository recordingRepository;
    private final TranscriptionRepository transcriptionRepository;
    private final SummaryRepository summaryRepository;
    private final ExternalApiService externalApiService;

    public MeetingController(MeetingService meetingService, MediaSoupService mediaSoupService,
            SimpMessagingTemplate messagingTemplate, UserRepository userRepository,
            MeetingRepository meetingRepository, RecordingRepository recordingRepository,
            TranscriptionRepository transcriptionRepository, SummaryRepository summaryRepository,
            ExternalApiService externalApiService) {
        this.meetingService = meetingService;
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
        this.meetingRepository = meetingRepository;
        this.recordingRepository = recordingRepository;
        this.transcriptionRepository = transcriptionRepository;
        this.summaryRepository = summaryRepository;
        this.externalApiService = externalApiService;
    }

    @PostMapping
    public CreateMeetingResponse createMeeting(CreateMeetingRequest request,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.createMeeting(request, userEmail);
    }

    @GetMapping("/{code}")
    public GetMeetingResponse getMeeting(@CookieValue(value = "accessToken", required = false) String accessToken,
            @PathVariable String code) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.getMeetingByCode(code, userEmail);
    }

    @PostMapping("/{code}")
    public JoinMeetingResponse askToJoinMeeting(@PathVariable String code,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.askToJoinMeeting(code, userEmail);
    }

    @PostMapping("/{code}/accept")
    public AskToJoinMeetingResponse acceptMeeting(@RequestBody AskToJoinMeetingRequest request,
            @PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.acceptMeeting(code, userEmail, request.getParticipantId());
    }

    @PostMapping("/{code}/reject")
    public AskToJoinMeetingResponse rejectMeeting(@RequestBody AskToJoinMeetingRequest request,
            @PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.rejectMeeting(code, userEmail, request.getParticipantId());
    }

    @PostMapping("/{code}/leave")
    public CreateMeetingResponse leaveMeeting(@PathVariable String code,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        UUID userId = UUID.fromString(JwtUtil.extractUserId(accessToken));
        return meetingService.leaveMeeting(code, userId);
    }

    @PostMapping("/{code}/end")
    public CreateMeetingResponse endMeeting(@PathVariable String code,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.endMeeting(code, userEmail);
    }

    @PostMapping("/{code}/kick/{participantId}")
    public CreateMeetingResponse kickParticipant(@PathVariable String code, @PathVariable String participantId,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.kickParticipant(code, userEmail, participantId);
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, String>> createMeeting() {
        String roomId = mediaSoupService.createRoom();
        return ResponseEntity.ok(Map.of("roomId", roomId));
    }

    // WebSocket handlers for signaling
    @MessageMapping("/join-room")
    public void joinRoom(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String roomId = (String) payload.get("roomId");
        String userId = (String) payload.get("userId");
        String userName = (String) payload.get("userName");

        // Process join room request
        // ...

        // Notify other participants
        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                Map.of("type", "user-joined", "userId", userId, "userName", userName));
    }

    @MessageMapping("/signal")
    public void handleSignal(@Payload Map<String, Object> payload) {
        String roomId = (String) payload.get("roomId");
        String to = (String) payload.get("to");

        // Forward the signaling message to the specific user
        messagingTemplate.convertAndSend("/queue/user/" + to, payload);
    }

    @GetMapping("/all")
    public Map<String, Object> getAllMeetingsForUser(
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userIdStr = JwtUtil.extractUserId(accessToken);
        System.out.println("userIdStr: " + userIdStr);
        UUID userId = null;
        if (userIdStr.compareTo("null") == 0) {
            System.out.println("userIdStr is null");
            String userEmail = JwtUtil.extractEmail(accessToken);
            System.out.println("userEmail: " + userEmail);
            userId = userRepository.findByEmail(userEmail).get().getId();

        } else {
            userId = UUID.fromString(userIdStr);
        }

        List<Meeting> meetings = meetingRepository.findAllByHostId(userId);

        // Sort meetings by createdAt in descending order (newest first)
        meetings.sort((m1, m2) -> m2.getCreatedAt().compareTo(m1.getCreatedAt()));

        Map<String, Object> result = new LinkedHashMap<>(); // Use LinkedHashMap to preserve order

        for (Meeting meeting : meetings) {
            // Create meeting details map
            Map<String, Object> meetingDetails = new HashMap<>();
            meetingDetails.put("id", meeting.getId());
            meetingDetails.put("code", meeting.getCode());
            meetingDetails.put("title", meeting.getTitle());
            meetingDetails.put("startTime", meeting.getStartTime());
            meetingDetails.put("endTime", meeting.getEndTime());
            meetingDetails.put("status", meeting.getStatus());
            meetingDetails.put("mediaRoomId", meeting.getMediaRoomId());
            meetingDetails.put("createdAt", meeting.getCreatedAt());

            // Create host details map with limited information
            Map<String, Object> hostDetails = new HashMap<>();
            hostDetails.put("id", meeting.getHost().getId());
            hostDetails.put("name", meeting.getHost().getName());
            hostDetails.put("email", meeting.getHost().getEmail());

            meetingDetails.put("host", hostDetails);

            // Get recording URL as a single string (or null if no recording exists)
            List<Recording> recordings = recordingRepository.findByMeetingId(meeting.getId());
            String recordingUrl = recordings.isEmpty() ? null : recordings.get(0).getUrl();
            meetingDetails.put("recordingUrl", recordingUrl);

            // Check if the meeting has a generated transcription
            Optional<Transcription> transcription = transcriptionRepository.findByMeetingId(meeting.getId());

            meetingDetails.put("transcriptionId", transcription.<Object>map(Transcription::getId).orElse(null));

            // Check if the meeting has a generated summary
            Optional<Summary> summary = summaryRepository.findByMeetingId(meeting.getId());

            meetingDetails.put("summaryId", summary.<Object>map(Summary::getId).orElse(null));

            // Add to result with meetingId as key
            result.put(meeting.getId().toString(), meetingDetails);
        }

        return result;
    }

    @PostMapping("/upload-recording")
    public ResponseEntity<Map<String, Object>> uploadRecording(
            @RequestBody Map<String, Object> request,
            @CookieValue(value = "accessToken", required = false) String accessToken) {

        return meetingService.uploadRecording(request, accessToken);
    }

    @PostMapping("/save-transcription")
    public ResponseEntity<Map<String, Object>> saveTranscription(
            @RequestBody Map<String, Object> request,
            @CookieValue(value = "accessToken", required = false) String accessToken) {

        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        String meetingCode = (String) request.get("meetingCode");
        String transcriptionData = (String) request.get("transcription");

        if (meetingCode == null || meetingCode.trim().isEmpty() || transcriptionData == null
                || transcriptionData.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(400), "Missing meetingCode or transcription");
        }

        Optional<Meeting> meeting = meetingRepository.findByCode(meetingCode);
        if (meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }

        Transcription transcription = new Transcription();
        transcription.setMeeting(meeting.get());
        transcription.setText(transcriptionData);

        Transcription savedTranscription = transcriptionRepository.save(transcription);

        // Prepare success response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Transcription saved successfully");
        response.put("transcriptionId", savedTranscription.getId().toString());
        response.put("meetingCode", savedTranscription.getMeeting().getCode());
        response.put("transcription", savedTranscription.getText());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/download-transcription/{meetingCode}")
    public ResponseEntity<Resource> downloadTranscription(
            @PathVariable String meetingCode,
            @CookieValue(value = "accessToken", required = false) String accessToken) {

        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        // Find meeting by code
        Optional<Meeting> meeting = meetingRepository.findByCode(meetingCode);
        if (meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }

        // Find transcription for the meeting
        Optional<Transcription> transcription = transcriptionRepository.findByMeetingId(meeting.get().getId());
        if (transcription.isEmpty() || transcription.get().getText() == null
                || transcription.get().getText().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "No transcription found for this meeting");
        }

        String transcriptionText = transcription.get().getText();

        // Create file content with metadata
        StringBuilder fileContent = new StringBuilder();
        fileContent.append("Meeting Transcription\n");
        fileContent.append("=====================\n\n");
        fileContent.append("Meeting Code: ").append(meetingCode).append("\n");
        fileContent.append("Meeting Title: ").append(meeting.get().getTitle()).append("\n");
        fileContent.append("Date: ").append(meeting.get().getCreatedAt()).append("\n");
        fileContent.append("Host: ").append(meeting.get().getHost().getName()).append("\n\n");
        fileContent.append("Transcription:\n");
        fileContent.append("==============\n\n");
        fileContent.append(transcriptionText);

        // Convert to bytes
        byte[] fileBytes = fileContent.toString().getBytes(StandardCharsets.UTF_8);
        ByteArrayResource resource = new ByteArrayResource(fileBytes);

        // Set filename
        String filename = "meeting-transcription-" + meetingCode + ".txt";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileBytes.length))
                .body(resource);
    }

    @GetMapping("/summary/{meetingCode}")
    public ResponseEntity<Map<String, Object>> getSummary(
            @PathVariable String meetingCode,
            @CookieValue(value = "accessToken", required = false) String accessToken) {

        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        Optional<Meeting> meeting = meetingRepository.findByCode(meetingCode);
        if (meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }

        Optional<Summary> existingSummary = summaryRepository.findByMeetingId(meeting.get().getId());
        Map<String, Object> response = new HashMap<>();

        if (existingSummary.isEmpty()) {
            // Generate new summary
            Optional<Transcription> transcription = transcriptionRepository.findByMeetingId(meeting.get().getId());
            if (transcription.isEmpty() || transcription.get().getText() == null
                    || transcription.get().getText().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatusCode.valueOf(404),
                        "No transcription found for this meeting");
            }

            try {
                // Call Express.js API to generate summary
                Map<String, Object> summaryResponse = externalApiService.generateSummary(
                        transcription.get().getText(),
                        meetingCode);

                // Extract summary data from response - it's a JSON string, not a Map
                String summaryJsonString = (String) summaryResponse.get("summary");

                // Parse the JSON string to Map<String, Object>
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> summaryData = objectMapper.readValue(summaryJsonString, Map.class);

                // Save summary to database - NO JSON conversion needed!
                Summary newSummary = new Summary();
                newSummary.setMeeting(meeting.get());
                newSummary.setSummary(summaryData); // Direct assignment!
                Summary savedSummary = summaryRepository.save(newSummary);

                response.put("success", true);
                response.put("meetingCode", meetingCode);
                response.put("summary", summaryData);
                response.put("isNewlyGenerated", true);
                response.put("summaryId", savedSummary.getId().toString());

            } catch (Exception e) {
                throw new ResponseStatusException(
                        HttpStatusCode.valueOf(500),
                        "Failed to generate summary: " + e.getMessage());
            }
        } else {

            response.put("success", true);
            response.put("meetingCode", meetingCode);
            response.put("summary", existingSummary.get().getSummary()); // Direct access!
            response.put("isNewlyGenerated", false);
            response.put("summaryId", existingSummary.get().getId().toString());
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/summary/{summaryId}")
    public ResponseEntity<Map<String, Object>> deleteSummary(
            @PathVariable String summaryId,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        UUID userId = UUID.fromString(JwtUtil.extractUserId(accessToken));
        return meetingService.deleteSummary(summaryId, userId);
    }

    @DeleteMapping("/transcription/{transcriptionId}")
    public ResponseEntity<Map<String, Object>> deleteTranscription(
            @PathVariable String transcriptionId,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        UUID userId = UUID.fromString(JwtUtil.extractUserId(accessToken));
        return meetingService.deleteTranscription(transcriptionId, userId);
    }

    @DeleteMapping("/{meetingId}")
    public ResponseEntity<Map<String, Object>> deleteMeeting(@PathVariable String meetingId,
            @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        UUID userId = UUID.fromString(JwtUtil.extractUserId(accessToken));
        return meetingService.deleteMeeting(meetingId, userId);
    }

}