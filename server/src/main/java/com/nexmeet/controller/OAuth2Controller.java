package com.nexmeet.controller;

import com.nexmeet.dto.AuthResponse;
import com.nexmeet.model.Role;
import com.nexmeet.model.User;
import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Optional;

@RestController
@RequestMapping("/api/oauth")
public class OAuth2Controller {

    private final UserRepository userRepository;

    public OAuth2Controller(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    @GetMapping("/google-success")
    public void googleLoginSuccess(HttpServletRequest request, HttpServletResponse response) throws IOException {
        System.out.println("Inside Google-success! ");
        // Retrieve the OAuth2 user from SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof OAuth2User)) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(500),"Google authentication failed!");
        }

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        System.out.println("Oauth User: "+oAuth2User);

        // Extract user details from Google
        String openId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String avatar = oAuth2User.getAttribute("picture");

        if (email == null) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(500),"Failed to retrieve email from Google account!");
        }

        // Check if user already exists in DB
        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            // Create new user in DB
            user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setOauthId(openId);
            user.setAvatar(avatar);
            user.setRole(Role.USER);
            userRepository.save(user);
        }

        System.out.println("User: "+user);
        // Generate JWT token
        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()), email);
        String refreshToken = JwtUtil.generateRefreshToken(email);

        System.out.println("refresh Token set");
        // Store refresh token in database
        user.setRefreshToken(refreshToken);
        userRepository.save(user);
        System.out.println("Refresh Token set success");

        // Set JWT as HttpOnly cookie
        addCookie(response, "accessToken", accessToken, 15 * 60);
        addCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60);

        response.sendRedirect("http://localhost:5173");
    }

    private void addCookie(HttpServletResponse response, String name, String value, int expiry) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setDomain("localhost");
        cookie.setMaxAge(expiry);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
