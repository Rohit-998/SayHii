package com.sayhii.service;

import com.sayhii.dto.request.LoginRequest;
import com.sayhii.dto.request.RegisterRequest;
import com.sayhii.dto.response.AuthResponse;
import com.sayhii.entity.User;
import com.sayhii.exception.DuplicateResourceException;
import com.sayhii.exception.UnauthorizedException;
import com.sayhii.repository.UserRepository;
import com.sayhii.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null && !request.getDisplayName().isBlank()
                        ? request.getDisplayName() : request.getUsername())
                .isOnline(false)
                .build();

        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .userId(user.getId())
                .message("Registration successful")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        user.setIsOnline(true);
        userRepository.save(user);

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .userId(user.getId())
                .message("Login successful")
                .build();
    }

    public AuthResponse oauthLogin(com.sayhii.dto.request.OAuthLoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            String baseUsername = request.getUsername();
            if (baseUsername == null || baseUsername.isBlank()) {
                baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            }
            if (baseUsername.isBlank()) {
                baseUsername = "user";
            }

            String finalUsername = baseUsername;
            int counter = 1;
            while (userRepository.existsByUsername(finalUsername)) {
                finalUsername = baseUsername + counter;
                counter++;
            }

            String displayName = request.getDisplayName();
            if (displayName == null || displayName.isBlank()) {
                displayName = finalUsername;
            }

            user = User.builder()
                    .email(email)
                    .username(finalUsername)
                    .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .displayName(displayName)
                    .profilePicture(request.getProfilePicture())
                    .isOnline(true)
                    .build();

            user = userRepository.save(user);
        } else {
            user.setIsOnline(true);
            if (request.getProfilePicture() != null && !request.getProfilePicture().isBlank()) {
                user.setProfilePicture(request.getProfilePicture());
            }
            if ((user.getDisplayName() == null || user.getDisplayName().isBlank()) && request.getDisplayName() != null) {
                user.setDisplayName(request.getDisplayName());
            }
            user = userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .userId(user.getId())
                .message("OAuth login successful")
                .build();
    }
}
