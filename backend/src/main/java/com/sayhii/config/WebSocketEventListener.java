package com.sayhii.config;

import com.sayhii.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = extractUsername(headerAccessor);

        if (username != null) {
            log.info("WebSocket connected: {}", username);
            try {
                userService.setOnlineStatus(username, true);
                messagingTemplate.convertAndSend("/topic/public", (Object) Map.of(
                        "type", "STATUS",
                        "username", username,
                        "online", true
                ));
            } catch (Exception e) {
                log.error("Error setting online status for {}: {}", username, e.getMessage());
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = extractUsername(headerAccessor);

        if (username != null) {
            log.info("WebSocket disconnected: {}", username);
            try {
                userService.setOnlineStatus(username, false);
                messagingTemplate.convertAndSend("/topic/public", (Object) Map.of(
                        "type", "STATUS",
                        "username", username,
                        "online", false
                ));
            } catch (Exception e) {
                log.error("Error setting offline status for {}: {}", username, e.getMessage());
            }
        }
    }

    private String extractUsername(StompHeaderAccessor headerAccessor) {
        Principal user = headerAccessor.getUser();
        if (user != null) {
            return user.getName();
        }
        if (headerAccessor.getSessionAttributes() != null) {
            Object sessionUser = headerAccessor.getSessionAttributes().get("username");
            if (sessionUser != null) {
                return sessionUser.toString();
            }
        }
        return null;
    }
}
