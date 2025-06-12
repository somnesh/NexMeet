package com.nexmeet.service;

import com.nexmeet.dto.AuthResponse;
import com.nexmeet.dto.LoginRequest;
import com.nexmeet.dto.RegisterRequest;
import com.nexmeet.model.Role;
import com.nexmeet.model.User;

import com.nexmeet.repository.UserRepository;
import com.nexmeet.util.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
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
import java.util.Optional;

import java.time.Duration;

@Service
public class AuthService {
    @Value("${PROD:false}")
    private String PROD;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
            PasswordEncoder passwordEncoder, UserDetailsService userDetailsService) {
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

        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()), request.getEmail());
        String refreshToken = JwtUtil.generateRefreshToken(request.getEmail());

        user.setRefreshToken(refreshToken);
        userRepository.save(user);
        // Set Access Token as HttpOnly Cookie
        setCookie(response, "accessToken", accessToken, 15 * 60); // 15 minutes expiry

        // Set Refresh Token as HttpOnly Cookie
        setCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60); // 7 days expiry

        return new AuthResponse(user.getName(), user.getId().toString(), user.getEmail(), user.getAvatar(), accessToken,
                refreshToken, "User registered successfully");
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) throws CredentialException {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

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

        return new AuthResponse(user.getName(), user.getId().toString(), user.getEmail(), user.getAvatar(), accessToken,
                refreshToken, "Login successful");
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
        String accessToken = JwtUtil.generateAccessToken(String.valueOf(user.getId()), userDetails.getUsername());
        String refreshToken = JwtUtil.generateRefreshToken(userDetails.getUsername());

        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        // Set Access Token as HttpOnly Cookie
        setCookie(response, "accessToken", accessToken, 15 * 60); // 15 minutes expiry

        // Set Refresh Token as HttpOnly Cookie
        setCookie(response, "refreshToken", refreshToken, 7 * 24 * 60 * 60); // 7 days expiry

        return new AuthResponse(user.getName(), user.getId().toString(), user.getEmail(), user.getAvatar(), accessToken,
                refreshToken, "Token refreshed");
    }

    public ResponseEntity<String> verifyEmail(String email, HttpServletResponse response) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent()) {
            if (user.get().getPassword() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                        "It looks like you signed up with Google. To access your account, please use the 'Sign in with Google' option on the login page.");
            }

            String resetToken = JwtUtil.generateAccessToken(String.valueOf(user.get().getId()), email);
            setCookie(response, "resetToken", resetToken, 10 * 60);

            return ResponseEntity.ok("User found with email: " + user.get().getEmail());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Oops! That email doesn’t match any account in our records.");
        }
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .domain("true".equals(PROD) ? ".onrender.com" : "localhost")
                .path("/")
                .maxAge(Duration.ofSeconds(maxAge))
                .sameSite("None")
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }
}
