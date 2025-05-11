package com.nexmeet.service;

import com.nexmeet.dto.AuthResponse;
import com.nexmeet.dto.LoginRequest;
import com.nexmeet.dto.RegisterRequest;
import com.nexmeet.model.Role;
import com.nexmeet.model.User;


import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.security.auth.login.CredentialException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository, PasswordEncoder passwordEncoder, UserDetailsService userDetailsService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered!");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        if (request.getRole() != null) {
            user.setRole(Role.valueOf(request.getRole().toUpperCase()));
        }

        user.setPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()), request.getEmail());
        String refreshToken = JwtUtil.generateRefreshToken(request.getEmail());

        // Set Access Token as HttpOnly Cookie
        setCookie(response, "accessToken", accessToken, 15 * 60); // 15 minutes expiry

        // Set Refresh Token as HttpOnly Cookie
        setCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60); // 7 days expiry

        return new AuthResponse(user.getName(), user.getId().toString(),user.getEmail(), user.getAvatar(), accessToken, refreshToken,"User registered successfully");
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) throws CredentialException {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();



        // Store refresh token in database
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CredentialException("User not found"));

        // Generate Access & Refresh Tokens
        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()), userDetails.getUsername());
        String refreshToken = JwtUtil.generateRefreshToken(userDetails.getUsername());

        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        // Set Access Token as HttpOnly Cookie
        setCookie(response, "accessToken", accessToken, 15 * 60); // 15 minutes expiry

        // Set Refresh Token as HttpOnly Cookie
        setCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60); // 7 days expiry

        return new AuthResponse(user.getName(), user.getId().toString(), user.getEmail(), user.getAvatar(), accessToken, refreshToken, "Login successful");
    }

    public AuthResponse getAccessToken(String token, HttpServletResponse response) throws CredentialException {
        if (token == null) {
            throw new IllegalArgumentException("Invalid token");
        }
        String email = JwtUtil.extractEmail(token);
        if (email == null || !JwtUtil.isTokenValid(token, email)) {
            throw new IllegalArgumentException("Invalid token");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        if (userDetails == null) {
            throw new UsernameNotFoundException("User not found");
        }



        // Store refresh token in database
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CredentialException("User not found"));

        // Generate Access & Refresh Tokens
        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()),userDetails.getUsername());
        String refreshToken = JwtUtil.generateRefreshToken(userDetails.getUsername());

        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        // Set Access Token as HttpOnly Cookie
        setCookie(response, "accessToken", accessToken, 15 * 60); // 15 minutes expiry

        // Set Refresh Token as HttpOnly Cookie
        setCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60); // 7 days expiry

        return new AuthResponse(user.getName(), user.getId().toString(), user.getEmail(), user.getAvatar(), accessToken, refreshToken, "Token refreshed");
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
