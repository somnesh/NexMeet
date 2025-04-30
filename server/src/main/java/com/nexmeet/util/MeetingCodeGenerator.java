package com.nexmeet.util;

import java.security.SecureRandom;

public class MeetingCodeGenerator {

    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateMeetingCode() {
        return randomChunk(3) + "-" + randomChunk(4) + "-" + randomChunk(3);
    }

    private static String randomChunk(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}

