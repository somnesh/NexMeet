package com.nexmeet.security;

import com.nexmeet.service.CustomUserDetailsService;
import com.nexmeet.util.JwtUtil;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final CustomUserDetailsService userDetailsService;

    public JwtFilter(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // Get the Authorization header
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // Check if header is present and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        // Extract the token (Remove "Bearer ")
        String token = authHeader.substring(7);

        try {
            // Extract email from token
            String email = JwtUtil.extractEmail(token);

            // Check if user is not already authenticated
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Fetch user details from database
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                // Create authentication token with authorities (roles)
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set authentication in Security Context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (JwtException e) {
            System.out.println("Invalid JWT Token: " + e.getMessage());
        }

        // Continue to the next filter in the chain
        chain.doFilter(request, response);
    }
}
