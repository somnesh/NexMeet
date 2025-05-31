package com.nexmeet.repository;

import com.nexmeet.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    Optional<Meeting> findByCode(String code);

    @Query("SELECT m FROM Meeting m WHERE m.host.id = :userId")
    List<Meeting> findAllByHostId(UUID userId);
}
