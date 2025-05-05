package com.nexmeet.service;

import com.nexmeet.config.SocketIoClientConfig;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Getter
@Setter
@Service
public class MediaSoupService {
    private static final Logger logger = LoggerFactory.getLogger(MediaSoupService.class);
    private final Map<String, Room> rooms = new HashMap<>();
    private final SocketIoClientConfig socketIoClient;

    public MediaSoupService(SocketIoClientConfig socketIoClient) {
        this.socketIoClient = socketIoClient;
    }

    public static class Room {
        private final String id;
        private final Map<String, User> participants = new HashMap<>();
        private final Map<String, Object> router;

        public Room(String id) {
            this.id = id;
            this.router = new HashMap<>();
        }

        public String getId() {
            return id;
        }

        public Map<String, User> getParticipants() {
            return participants;
        }

        public Map<String, Object> getRouter() {
            return router;
        }

        public void addParticipant(User user) {
            participants.put(user.getId(), user);
        }

        public void removeParticipant(String userId) {
            participants.remove(userId);
        }

        public boolean hasParticipant(String userId) {
            return participants.containsKey(userId);
        }
    }

    public static class User {
        private final String id;
        private final String name;
        private Map<String, Object> transport;
        private Map<String, Object> producer;
        private Map<String, Object> consumer;

        public User(String id, String name) {
            this.id = id;
            this.name = name;
            this.transport = new HashMap<>();
            this.producer = new HashMap<>();
            this.consumer = new HashMap<>();
        }

        public String getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public Map<String, Object> getTransport() {
            return transport;
        }

        public Map<String, Object> getProducer() {
            return producer;
        }

        public Map<String, Object> getConsumer() {
            return consumer;
        }
    }

    public String createRoom() {
        CompletableFuture<String> future = new CompletableFuture<>();
        System.out.println("debug: 1");
        if (!socketIoClient.isConnected()) {
            throw new RuntimeException("Socket.IO client is not connected");
        }

        System.out.println("debug: 2");
        String roomId = UUID.randomUUID().toString();
        socketIoClient.getSocket().emit("joinRoom", new String[]{roomId}, (Object... args) -> {
            System.out.println("debug: 2.1");
            if (args != null && args.length > 0 && args[0] != null) {
                System.out.println("debug: 2.2");
                rooms.put(roomId, new Room(roomId));
                System.out.println("debug: 2.3");
                future.complete(roomId);
                
            } else {
                future.completeExceptionally(new RuntimeException("Failed to create room"));
            }
        });
        
        System.out.println("debug: 3");
        try {
            System.out.println("debug: 4");
            return future.get();
        } catch (Exception e) {
            logger.error("Error creating room: ", e);
            throw new RuntimeException("Failed to create room", e);
        }
    }

    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    public Map<String, Room> getRooms() {
        return rooms;
    }

    public void joinRoom(String roomId, User user) {
        Room room = rooms.get(roomId);
        if (room == null) {
            throw new RuntimeException("Room not found: " + roomId);
        }

        CompletableFuture<Void> future = new CompletableFuture<>();
        
        Map<String, Object> joinData = new HashMap<>();
        joinData.put("roomId", roomId);
        joinData.put("userId", user.getId());
        joinData.put("name", user.getName());

        socketIoClient.getSocket().emit("joinRoom", new Map[]{joinData}, (Object... args) -> {
            if (args != null && args.length > 0 && args[0] != null) {
                room.addParticipant(user);
                future.complete(null);
            } else {
                future.completeExceptionally(new RuntimeException("Failed to join room"));
            }
        });

        try {
            future.get();
        } catch (Exception e) {
            logger.error("Error joining room: ", e);
            throw new RuntimeException("Failed to join room", e);
        }
    }

    public void leaveRoom(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room != null && room.hasParticipant(userId)) {
            room.removeParticipant(userId);
            socketIoClient.getSocket().emit("leaveRoom", roomId, userId);

            // If room is empty, remove it
            if (room.getParticipants().isEmpty()) {
                rooms.remove(roomId);
            }
        }
    }

    public void closeRoom(String roomId) {
        Room room = rooms.get(roomId);
        if (room != null) {
            socketIoClient.getSocket().emit("closeRoom", roomId);
            rooms.remove(roomId);
        }
    }

    public CompletableFuture<Map<String, Object>> createTransport(String roomId, String userId, String direction) {
        CompletableFuture<Map<String, Object>> future = new CompletableFuture<>();
        
        Map<String, Object> params = new HashMap<>();
        params.put("direction", direction);
        
        socketIoClient.getSocket().emit("createWebRtcTransport", new Map[]{params}, (Object... args) -> {
            if (args.length > 0 && args[0] instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = (Map<String, Object>) args[0];
                future.complete(response);
            } else {
                future.completeExceptionally(new RuntimeException("Failed to create transport"));
            }
        });
        
        return future;
    }

    public CompletableFuture<Boolean> connectTransport(String transportId, Map<String, Object> dtlsParameters) {
        CompletableFuture<Boolean> future = new CompletableFuture<>();
        
        Map<String, Object> params = new HashMap<>();
        params.put("transportId", transportId);
        params.put("dtlsParameters", dtlsParameters);
        
        socketIoClient.getSocket().emit("connectTransport", new Map[]{params}, (Object... args) -> {
            if (args.length > 0 && args[0] instanceof Map) {
                future.complete(true);
            } else {
                future.completeExceptionally(new RuntimeException("Failed to connect transport"));
            }
        });
        
        return future;
    }
}