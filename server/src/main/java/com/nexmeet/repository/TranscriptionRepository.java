package com.nexmeet.repository;

import com.nexmeet.model.Transcription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TranscriptionRepository extends JpaRepository<Transcription, UUID> {
    Optional<Transcription> findByMeetingId(UUID meetingId);
}
