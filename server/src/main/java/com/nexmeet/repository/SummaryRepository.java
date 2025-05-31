package com.nexmeet.repository;

import com.nexmeet.model.Summary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SummaryRepository extends JpaRepository<Summary, UUID> {
    Optional<Summary> findByMeetingId(UUID meetingId);
}
