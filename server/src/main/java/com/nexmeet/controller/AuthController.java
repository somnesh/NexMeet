package com.nexmeet.controller;

import com.nexmeet.dto.AuthResponse;
import com.nexmeet.dto.LoginRequest;
import com.nexmeet.dto.RegisterRequest;
import com.nexmeet.dto.ResetPasswordRequest;
import com.nexmeet.model.User;
import com.nexmeet.repository.UserRepository;
import com.nexmeet.service.AuthService;
import com.nexmeet.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.security.auth.login.CredentialException;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthService authService, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request, HttpServletResponse response) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request, response));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request, HttpServletResponse response)
            throws CredentialException {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @PostMapping("/access-token")
    public ResponseEntity<AuthResponse> getAccessToken(
            @CookieValue(value = "refreshToken", required = false) String token, HttpServletResponse response)
            throws CredentialException {
        return ResponseEntity.ok(authService.getAccessToken(token, response));
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@CookieValue(value = "accessToken", required = false) String token,
            HttpServletResponse response) throws CredentialException {
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
        }

        String email = JwtUtil.extractEmail(token);

        if (!JwtUtil.isTokenValid(token, email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
        }

        return ResponseEntity.ok("Token is valid");
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request,
            @CookieValue(value = "accessToken", required = false) String accessToken,
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response) {
        // Remove refresh token from the database
        if (refreshToken != null) {
            Optional<User> userOpt = userRepository.findByRefreshToken(refreshToken);
            userOpt.ifPresent(user -> {
                user.setRefreshToken(null);
                userRepository.save(user);
            });
        }

        SecurityContextHolder.clearContext();

        // Invalidate HTTP session
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Expire cookies
        expireCookie(response, "accessToken");
        expireCookie(response, "refreshToken");
        expireCookie(response, "JSESSIONID");

        // Also expire any OAuth2 related cookies
        expireCookie(response, "JSESSIONID.OAuth2");

        return ResponseEntity.ok("Logout successful!");
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<String> getUserByEmail(@PathVariable String email, HttpServletResponse response) {
        return authService.verifyEmail(email, response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request, @CookieValue(value = "resetToken", required = false) String resetToken, HttpServletResponse response) {
        if(resetToken == null || !JwtUtil.isTokenValid(resetToken, request.getEmail())){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
        }

        Optional<User> user = userRepository.findByEmail(request.getEmail());
        if(user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User does not exist");
        }


        User userToUpdate = user.get();
        userToUpdate.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(userToUpdate);

        return ResponseEntity.ok("Password reset successful");
    }

    private void expireCookie(HttpServletResponse response, String cookieName) {
        Cookie cookie = new Cookie(cookieName, null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Expire immediately
        response.addCookie(cookie);
    }
}
