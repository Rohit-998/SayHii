package com.sayhii.dto.request;

import com.sayhii.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MessageRequest {

    @NotBlank(message = "Content is required")
    private String content;

    @NotNull(message = "Chat room ID is required")
    private Long chatRoomId;

    private MessageType messageType = MessageType.TEXT;
}
