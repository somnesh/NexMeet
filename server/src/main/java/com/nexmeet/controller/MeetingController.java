package com.nexmeet.controller;

import com.nexmeet.config.WebRTCConfig;
import com.nexmeet.model.Meeting;
import com.nexmeet.service.MediaSoupService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    private final MediaSoupService mediaSoupService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebRTCConfig webRTCConfig;

    public MeetingController(MediaSoupService mediaSoupService, SimpMessagingTemplate messagingTemplate, WebRTCConfig webRTCConfig) {
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
        this.webRTCConfig = webRTCConfig;
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