package com.nexmeet.dto;

import com.nexmeet.model.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JoinMeetingResponse {
    private String code;
    private MeetingStatus currentStatus;
}
