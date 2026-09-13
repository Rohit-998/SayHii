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
