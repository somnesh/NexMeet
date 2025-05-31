package com.nexmeet.dto;

import com.nexmeet.model.MeetingStatus;
import com.nexmeet.model.ParticipantStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class JoinMeetingResponse {
    private String code;
    private MeetingStatus meetingStatus;
    private ParticipantStatus participantStatus;
    private UUID participantId;
}
