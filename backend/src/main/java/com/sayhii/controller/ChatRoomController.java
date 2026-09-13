package com.sayhii.controller;

import com.sayhii.dto.request.ChatRoomRequest;
import com.sayhii.dto.response.ChatRoomResponse;
import com.sayhii.entity.User;
import com.sayhii.service.ChatRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @PostMapping
    public ResponseEntity<ChatRoomResponse> createRoom(
            @Valid @RequestBody ChatRoomRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRoomService.createRoom(request, user));
    }

    @PostMapping("/private")
    public ResponseEntity<ChatRoomResponse> createPrivateRoom(
            @RequestBody java.util.Map<String, Long> request,
            @AuthenticationPrincipal User user) {
        Long userId = request.get("userId");
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRoomService.createPrivateRoom(userId, user));
    }

    @PostMapping("/group")
    public ResponseEntity<ChatRoomResponse> createGroupRoom(
            @RequestBody java.util.Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        String name = (String) request.get("name");
        @SuppressWarnings("unchecked")
        List<Number> memberInts = (List<Number>) request.get("memberIds");
        List<Long> memberIds = memberInts != null
                ? memberInts.stream().map(Number::longValue).toList()
                : List.of();
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRoomService.createGroupRoom(name, memberIds, user));
    }

    @GetMapping
    public ResponseEntity<List<ChatRoomResponse>> getUserRooms(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatRoomService.getUserRooms(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatRoomResponse> getRoomById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatRoomService.getRoomById(id, user));
    }
}
