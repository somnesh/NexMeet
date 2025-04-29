package com.nexmeet.security;

import com.nexmeet.service.CustomUserDetailsService;
import com.nexmeet.util.JwtUtil;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
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

        // Check if path should be excluded from authentication
        if (shouldNotFilter(request)) {
            chain.doFilter(request, response);
            return;
        }

        // First try to get token from cookies
        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        // If no token in cookies, try Authorization header as fallback
        if (token == null) {
            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        // If no token found, continue to next filter (will be blocked by security config)
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            // Extract email from token
            String email = JwtUtil.extractEmail(token);

            // Validate token
            if (email != null && JwtUtil.isTokenValid(token, email) &&
                    SecurityContextHolder.getContext().getAuthentication() == null) {

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
            logger.error("Invalid JWT Token: " + e.getMessage());
            // Don't set the security context
        }

        // Continue to the next filter in the chain
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Don't apply filter to public paths
        return path.startsWith("/api/auth/") ||
                path.startsWith("/api/oauth/") ||
                path.startsWith("/oauth2/") ||
                path.equals("/api/health-check");
    }
}