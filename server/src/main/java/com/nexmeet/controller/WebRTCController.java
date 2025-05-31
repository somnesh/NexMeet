package com.nexmeet.controller;

import com.nexmeet.service.MediaSoupService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/webrtc")
public class WebRTCController {
    private final MediaSoupService mediaSoupService;
    private final SimpMessagingTemplate messagingTemplate;

    public WebRTCController(MediaSoupService mediaSoupService, SimpMessagingTemplate messagingTemplate) {
        this.mediaSoupService = mediaSoupService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/transport")
    public CompletableFuture<Map<String, Object>> createTransport(
            @RequestBody Map<String, String> params) {
        return mediaSoupService.createTransport(
                params.get("roomId"),
                params.get("userId"),
                params.get("direction"));
    }

    @PostMapping("/transport/connect")
    public CompletableFuture<Boolean> connectTransport(
            @RequestBody Map<String, Object> params) {
        return mediaSoupService.connectTransport(
                (String) params.get("transportId"),
                (Map<String, Object>) params.get("dtlsParameters"));
    }

    @GetMapping("/rooms/{roomId}")
    public MediaSoupService.Room getRoomInfo(@PathVariable String roomId) {
        return mediaSoupService.getRoom(roomId);
    }

    @GetMapping("/rooms")
    public Map<String, MediaSoupService.Room> getAllRooms() {
        return mediaSoupService.getRooms();
    }

    @PostMapping("/rooms/{roomId}/leave")
    public void leaveRoom(@PathVariable String roomId,
            @RequestParam String userId) {
        mediaSoupService.leaveRoom(roomId, userId);
    }

    @DeleteMapping("/rooms/{roomId}")
    public void closeRoom(@PathVariable String roomId) {
        mediaSoupService.closeRoom(roomId);
    }

    @MessageMapping("/room/leave")
    public void handleLeaveRoom(Map<String, String> payload) {
        String roomId = payload.get("roomId");
        String userId = payload.get("userId");
        mediaSoupService.leaveRoom(roomId, userId);

        // Notify other participants
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId,
                Map.of("type", "user-left", "userId", userId));
    }

}
