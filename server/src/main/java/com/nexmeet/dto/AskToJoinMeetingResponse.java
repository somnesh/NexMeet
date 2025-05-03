package com.nexmeet.dto;

import com.nexmeet.model.ParticipantStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class AskToJoinMeetingResponse {
    private String meetingCode;
    private ParticipantStatus participantStatus;
    private UUID participantId;
}
