package com.sayhii.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String profilePicture;
    private Boolean isOnline;
    private LocalDateTime createdAt;

    @JsonProperty("online")
    public boolean getOnline() {
        return isOnline != null && isOnline;
    }
}
