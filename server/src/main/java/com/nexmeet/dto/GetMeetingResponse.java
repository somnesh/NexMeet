package com.nexmeet.dto;

import com.nexmeet.model.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GetMeetingResponse {
    private String code;
    private String title;
    private MeetingStatus status;
    private String mediaRoomId;
    private boolean isHost;
}
