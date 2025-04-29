package com.nexmeet.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JoinMeetingResponse {
    private String code;
    private String currentStatus;
}
