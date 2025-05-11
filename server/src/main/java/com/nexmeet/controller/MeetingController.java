package com.nexmeet.controller;

import com.nexmeet.config.WebRTCConfig;
import com.nexmeet.dto.*;
import com.nexmeet.model.Meeting;
import com.nexmeet.model.User;
import com.nexmeet.service.MediaSoupService;
import com.nexmeet.service.MeetingService;
import com.nexmeet.util.JwtUtil;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meeting")
public class MeetingController {

    private final MeetingService meetingService;
    private final MediaSoupService mediaSoupService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebRTCConfig webRTCConfig;

    public MeetingController(MeetingService meetingService, MediaSoupService mediaSoupService, SimpMessagingTemplate messagingTemplate, WebRTCConfig webRTCConfig) {
        this.meetingService = meetingService;
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
        this.webRTCConfig = webRTCConfig;
    }

    @PostMapping
    public CreateMeetingResponse createMeeting(CreateMeetingRequest request, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }

        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.createMeeting(request, userEmail);
    }

    @GetMapping("/{code}")
    public GetMeetingResponse getMeeting(@CookieValue(value = "accessToken", required = false) String accessToken, @PathVariable String code) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.getMeetingByCode(code, userEmail);
    }

    @PostMapping("/{code}")
    public JoinMeetingResponse askToJoinMeeting(@PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.askToJoinMeeting(code, userEmail);
    }

    @PostMapping("/{code}/accept")
    public AskToJoinMeetingResponse acceptMeeting(@RequestBody AskToJoinMeetingRequest request, @PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.acceptMeeting(code, userEmail, request.getParticipantId());
    }

    @PostMapping("/{code}/reject")
    public AskToJoinMeetingResponse rejectMeeting(@RequestBody AskToJoinMeetingRequest request,@PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.rejectMeeting(code, userEmail, request.getParticipantId());
    }

    @PostMapping("/{code}/leave")
    public CreateMeetingResponse leaveMeeting(@PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        UUID userId = UUID.fromString(JwtUtil.extractUserId(accessToken));
        return meetingService.leaveMeeting(code, userId);
    }

    @PostMapping("/{code}/end")
    public CreateMeetingResponse endMeeting(@PathVariable String code, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.endMeeting(code, userEmail);
    }

    @PostMapping("/{code}/kick/{participantId}")
    public CreateMeetingResponse kickParticipant(@PathVariable String code, @PathVariable String participantId, @CookieValue(value = "accessToken", required = false) String accessToken) {
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(401), "Unauthorized");
        }
        String userEmail = JwtUtil.extractEmail(accessToken);
        return meetingService.kickParticipant(code, userEmail, participantId);
    }

    @GetMapping("/ice-servers")
    public ResponseEntity<Map<String, Object>> getIceServers() {
        return ResponseEntity.ok(webRTCConfig.getIceServers());
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
}