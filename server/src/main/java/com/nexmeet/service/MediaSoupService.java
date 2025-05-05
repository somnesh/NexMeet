package com.nexmeet.service;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Service
public class MediaSoupService {
    // Store active rooms - in a production app, consider a database
    private final Map<String, Room> rooms = new HashMap<>();

    // Room model to track participants and settings
    public static class Room {
        private final String id;
        private final Map<String, User> participants = new HashMap<>();

        public Room(String id) {
            this.id = id;
        }

        // Room getters/setters and methods
    }

    public static class User {
        private final String id;
        private final String name;

        public User(String id, String name) {
            this.id = id;
            this.name = name;
        }

        // User getters/setters
    }

    public String createRoom() {
        String roomId = UUID.randomUUID().toString();
        rooms.put(roomId, new Room(roomId));
        return roomId;
    }

    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    // Add more methods for room management
}