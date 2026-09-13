package com.sayhii.dto.response;

import com.sayhii.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {
    private Long id;
    private String name;
    private RoomType roomType;
    private Long createdById;
    private List<UserResponse> members;
    private MessageResponse lastMessage;
    private LocalDateTime createdAt;
}
