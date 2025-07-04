package com.nexmeet.repository;

import com.nexmeet.model.Meeting;
import com.nexmeet.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    Optional<Participant> findById(UUID id);

    Optional<Participant> findByUserIdAndMeeting(UUID userId, Meeting meeting);

    @Modifying
    @Query("update Participant p set p.leftAt = :currentTime where p.meeting.id = :meetingId")
    void endMeeting(@Param("meetingId") UUID meetingId, @Param("currentTime") Instant currentTime);
}
