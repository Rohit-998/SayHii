package com.sayhii.dto.response;

import com.sayhii.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private String content;
    private MessageType messageType;
    private Long senderId;
    private String senderUsername;
    private String senderDisplayName;
    private Long chatRoomId;
    private LocalDateTime createdAt;
}
