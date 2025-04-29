package com.nexmeet.service;

import com.nexmeet.dto.CreateMeetingRequest;
import com.nexmeet.dto.CreateMeetingResponse;
import com.nexmeet.dto.JoinMeetingResponse;
import com.nexmeet.model.Meeting;
import com.nexmeet.model.User;
import com.nexmeet.repository.MeetingRepository;
import com.nexmeet.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

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

    public CreateMeetingResponse createMeeting(CreateMeetingRequest request, String userId) {
        User host = userRepository.findById(UUID.fromString(userId)).orElseThrow(
                () -> new RuntimeException("Host not found")
        );

        Meeting meeting = new Meeting();
        meeting.setCode(UUID.randomUUID().toString().substring(0, 8));
        meeting.setTitle(request.getTitle());
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
        if(meeting.isPresent()) {
            System.out.println(meeting.get().getId());
        }
//        if exists create add a new record into the participant table
        return new JoinMeetingResponse("", "");
    }

}
