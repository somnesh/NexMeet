package com.nexmeet.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthResponse {
    private String name;
    private String id;
    private String email;
    private String avatar;
    private String accessToken;
    private String refreshToken;
    private String message;

    public AuthResponse(String name, String id, String email,String avatar, String accessToken, String refreshToken, String message) {
        this.name = name;
        this.id = id;
        this.email = email;
        this.avatar = avatar;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.message = message;
    }
}
