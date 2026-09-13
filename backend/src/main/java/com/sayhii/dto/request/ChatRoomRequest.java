package com.sayhii.dto.request;

import com.sayhii.enums.RoomType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ChatRoomRequest {

    private String name;

    @NotNull(message = "Room type is required")
    private RoomType roomType;

    @NotEmpty(message = "At least one member is required")
    private List<Long> memberIds;
}
