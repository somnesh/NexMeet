package com.nexmeet.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "meetings")
public class Meeting {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true)
    private String code;

    @ManyToOne
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    private String title;

    @Column(nullable = false)
    private Instant startTime;

    private Instant endTime;

    @Enumerated(EnumType.STRING)
    private MeetingStatus status;
    public Meeting() {
        this.status = MeetingStatus.ACTIVE;
    }

    @Column(name = "media_room_id")
    private String mediaRoomId;


    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

}
