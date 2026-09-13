package com.sayhii.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${spring.websocket.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client subscribes to /topic/... or /queue/... to receive messages
        registry.enableSimpleBroker("/topic", "/queue");
        // Client sends messages with prefix /app/...
        registry.setApplicationDestinationPrefixes("/app");
        // For user-specific messaging (e.g. notifications)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket handshake endpoint with SockJS fallback support
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();

        // Also expose pure WebSocket endpoint without SockJS for clients that prefer standard WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","));
    }
}
