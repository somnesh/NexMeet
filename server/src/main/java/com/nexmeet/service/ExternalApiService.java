// filepath: c:\Users\somne\OneDrive\Desktop\git\NexMeet\server\src\main\java\com\nexmeet\service\ExternalApiService.java
package com.nexmeet.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class ExternalApiService {

    private final WebClient webClient;

    public ExternalApiService(@Value("${express.server.url:http://localhost:3000}") String expressServerUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(expressServerUrl)
                .build();
    }

    public Map<String, Object> generateSummary(String transcription, String meetingCode) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "transcription", transcription,
                    "meetingId", meetingCode
            );

            Map<String, Object> response = webClient.post()
                    .uri("/api/generate-summary")
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse -> {
                        throw new ResponseStatusException(
                                HttpStatusCode.valueOf(500),
                                "Failed to generate summary from Express.js server"
                        );
                    })
                    .bodyToMono(Map.class)
                    .block();

            return response;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatusCode.valueOf(500),
                    "Error calling Express.js summary service: " + e.getMessage()
            );
        }
    }
}