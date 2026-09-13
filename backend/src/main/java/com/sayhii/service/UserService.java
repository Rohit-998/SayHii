package com.sayhii.service;

import com.sayhii.dto.response.UserResponse;
import com.sayhii.entity.User;
import com.sayhii.exception.ResourceNotFoundException;
import com.sayhii.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToResponse(user);
    }

    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return mapToResponse(user);
    }

    public List<UserResponse> searchUsers(String query) {
        return userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void setOnlineStatus(String username, boolean isOnline) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        user.setIsOnline(isOnline);
        userRepository.save(user);
    }

    public UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .profilePicture(user.getProfilePicture())
                .isOnline(user.getIsOnline())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
