package com.nexmeet.repository;

import com.nexmeet.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    Optional<Meeting> findByCode(String code);
}
