package com.nexmeet.service;

import com.nexmeet.dto.CreateMeetingRequest;
import com.nexmeet.dto.CreateMeetingResponse;
import com.nexmeet.dto.JoinMeetingResponse;
import com.nexmeet.model.Meeting;
import com.nexmeet.model.User;
import com.nexmeet.repository.MeetingRepository;
import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.MeetingCodeGenerator;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class MeetingService {
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    public MeetingService(MeetingRepository meetingRepository, UserRepository userRepository) {
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CreateMeetingResponse createMeeting(CreateMeetingRequest request, String userEmail) {
        User host = userRepository.findByEmail(userEmail).orElseThrow(
                () -> new RuntimeException("Host not found")
        );

        Meeting meeting = new Meeting();
        String code = MeetingCodeGenerator.generateMeetingCode();

        meeting.setCode(code);
        meeting.setTitle(request.getTitle() != null ? request.getTitle() : "Instant Meeting");
        meeting.setHost(host);
        meeting.setStartTime(Instant.now());
        meetingRepository.save(meeting);

        return new CreateMeetingResponse(meeting.getCode(), meeting.getTitle(), meeting.getStatus());
    }

    private Meeting getMeeting(String code) {
        return meetingRepository.findByCode(code).orElseThrow(()-> new RuntimeException("Meeting not found"));
    }

    public JoinMeetingResponse askToJoinMeeting(String code, String userId) {
        Optional<Meeting> meeting = meetingRepository.findByCode(code);
//        Check if the meeting exists or not
        if(meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }
//        if exists create add a new record into the participant table
        return new JoinMeetingResponse(meeting.get().getCode(), meeting.get().getStatus());
    }

}
