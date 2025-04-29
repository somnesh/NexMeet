package com.nexmeet.dto;

import com.nexmeet.model.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateMeetingResponse {
    private String code;
    private String title;
    private MeetingStatus status;
}
