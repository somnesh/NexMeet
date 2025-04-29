package com.nexmeet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

@Configuration
public class WebRTCConfig {

    @Value("${stun.server.urls:stun:stun.l.google.com:19302}")
    private String stunServerUrls;

    // For Open Relay
    @Value("${turn.server.urls:turn:openrelay.metered.ca:80}")
    private String turnServerUrls;

    @Value("${turn.server.username:openrelayproject}")
    private String turnServerUsername;

    @Value("${turn.server.credential:openrelayproject}")
    private String turnServerCredential;

    public Map<String, Object> getIceServers() {
        return Map.of(
                "iceServers", List.of(
                        Map.of("urls", stunServerUrls.split(",")),
                        Map.of(
                                "urls", turnServerUrls.split(","),
                                "username", turnServerUsername,
                                "credential", turnServerCredential
                        )
                )
        );
    }
}