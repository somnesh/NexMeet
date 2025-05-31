package com.nexmeet.repository;

import com.nexmeet.model.Recording;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RecordingRepository extends JpaRepository<Recording, UUID> {
    List<Recording> findByMeetingId(UUID meetingId);

    @Query("SELECT r FROM Recording r JOIN Meeting m ON r.meeting.id = m.id WHERE m.code = :meetingCode")
    List<Recording> findByMeetingCode(@Param("meetingCode") String meetingCode);
}
