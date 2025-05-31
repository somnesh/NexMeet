package com.nexmeet.repository;

import com.nexmeet.model.Meeting;
import com.nexmeet.model.MeetingStatus;
import com.nexmeet.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    Optional<Meeting> findByCode(String code);
    @Query("SELECT m FROM Meeting m WHERE m.host.id = :userId")
    List<Meeting> findAllByHostId(UUID userId);

    @Modifying
    @Query("UPDATE Meeting m SET m.startTime = :startTime, m.status = :status WHERE m.id = :meetingId")
    void updateStartTimeAndStatus(UUID meetingId, Instant startTime, MeetingStatus status);
}
