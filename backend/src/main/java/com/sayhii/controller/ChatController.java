package com.sayhii.controller;

import com.sayhii.dto.request.MessageRequest;
import com.sayhii.dto.response.MessageResponse;
import com.sayhii.entity.User;
import com.sayhii.exception.UnauthorizedException;
import com.sayhii.repository.UserRepository;
import com.sayhii.security.JwtService;
import com.sayhii.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    /**
     * WebSocket endpoint: Client sends messages to /app/chat.sendMessage
     * Broadcasts saved message to /topic/room.{chatRoomId}
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload MessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String username = null;

        // Try getting user from Principal first
        if (headerAccessor.getUser() != null) {
            username = headerAccessor.getUser().getName();
        }

        // Fallback: extract from Authorization header in STOMP headers
        if (username == null) {
            String authHeader = headerAccessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    username = jwtService.extractUsername(token);
                } catch (Exception e) {
                    log.error("Failed to parse JWT token from STOMP header: {}", e.getMessage());
                }
            }
        }

        if (username == null) {
            log.error("Unauthorized WebSocket message attempt: No user principal or valid token found");
            return;
        }

        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found: " + username));

        MessageResponse response = messageService.saveMessage(request, sender);

        // Broadcast to all subscribers of this chat room
        messagingTemplate.convertAndSend("/topic/room." + request.getChatRoomId(), response);
    }

    /**
     * REST endpoint: Send message (HTTP fallback) and broadcast over WebSocket
     */
    @PostMapping("/api/messages")
    public ResponseEntity<MessageResponse> sendMessageRest(
            @Valid @RequestBody MessageRequest request,
            @AuthenticationPrincipal User user) {
        MessageResponse response = messageService.saveMessage(request, user);
        messagingTemplate.convertAndSend("/topic/room." + request.getChatRoomId(), response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * REST endpoint: Get paginated chat history
     */
    @GetMapping("/api/messages/{chatRoomId}")
    public ResponseEntity<Page<MessageResponse>> getChatHistory(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(messageService.getChatHistory(chatRoomId, page, size, user));
    }
}
