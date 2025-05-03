package com.nexmeet.repository;

import com.nexmeet.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    Optional<Participant> findByMeetingId(UUID meetingId);
    Optional<Participant> findById(UUID id);
//    void deleteByMeetingId(String meetingId);
}
