package com.nexmeet.service;

import com.nexmeet.dto.AskToJoinMeetingResponse;
import com.nexmeet.dto.CreateMeetingRequest;
import com.nexmeet.dto.CreateMeetingResponse;
import com.nexmeet.dto.JoinMeetingResponse;
import com.nexmeet.model.Meeting;
import com.nexmeet.model.Participant;
import com.nexmeet.model.ParticipantStatus;
import com.nexmeet.model.User;
import com.nexmeet.repository.MeetingRepository;
import com.nexmeet.repository.ParticipantRepository;
import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.MeetingCodeGenerator;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class MeetingService {
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final ParticipantRepository participantRepository;

    public MeetingService(MeetingRepository meetingRepository, UserRepository userRepository, ParticipantRepository participantRepository) {
        this.meetingRepository = meetingRepository;
        this.userRepository = userRepository;
        this.participantRepository = participantRepository;
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

    @Transactional
    public JoinMeetingResponse askToJoinMeeting(String code, String userEmail) {
        Optional<Meeting> meeting = meetingRepository.findByCode(code);
//        Check if the meeting exists or not
        if(meeting.isEmpty()) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(404), "Meeting not found");
        }

        if (meeting.get().getHost().getEmail().equals(userEmail)) {
            return new JoinMeetingResponse(meeting.get().getCode(), meeting.get().getStatus(), ParticipantStatus.ACCEPTED, null);
        }
//        if exists create add a new record into the participant table
        User user = userRepository.findByEmail(userEmail).orElseThrow(()-> new ResponseStatusException(HttpStatusCode.valueOf(404),"User not found"));

        Participant participant = new Participant();
        participant.setUser(user);
        participant.setMeeting(meeting.get());
        participant.setStatus(ParticipantStatus.WAITING);
        participantRepository.save(participant);
        return new JoinMeetingResponse(meeting.get().getCode(), meeting.get().getStatus(), participant.getStatus(), participant.getId());
    }

    @Transactional
    public AskToJoinMeetingResponse acceptMeeting(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);

        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403),"You are not the host of the meeting");
        }

        Participant participant = participantRepository.findById(UUID.fromString(participantId)).orElseThrow(()-> new ResponseStatusException(HttpStatusCode.valueOf(404),"Participant not found"));
        participant.setStatus(ParticipantStatus.ACCEPTED);
        participantRepository.save(participant);

        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }

    @Transactional
    public AskToJoinMeetingResponse rejectMeeting(String code, String userEmail, String participantId) {
        Meeting meeting = getMeeting(code);
        if (!meeting.getHost().getEmail().equals(userEmail)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(403),"You are not the host of the meeting");
        }
        Participant participant = participantRepository.findById(UUID.fromString(participantId)).orElseThrow(()-> new ResponseStatusException(HttpStatusCode.valueOf(404),"Participant not found"));
        participant.setStatus(ParticipantStatus.REJECTED);
        participantRepository.save(participant);
        return new AskToJoinMeetingResponse(code, participant.getStatus(), participant.getId());
    }
}
