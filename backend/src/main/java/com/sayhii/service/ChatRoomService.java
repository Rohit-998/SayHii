package com.sayhii.service;

import com.sayhii.dto.request.ChatRoomRequest;
import com.sayhii.dto.response.ChatRoomResponse;
import com.sayhii.dto.response.MessageResponse;
import com.sayhii.entity.ChatRoom;
import com.sayhii.entity.ChatRoomMember;
import com.sayhii.entity.Message;
import com.sayhii.entity.User;
import com.sayhii.enums.RoomType;
import com.sayhii.exception.DuplicateResourceException;
import com.sayhii.exception.ResourceNotFoundException;
import com.sayhii.repository.ChatRoomMemberRepository;
import com.sayhii.repository.ChatRoomRepository;
import com.sayhii.repository.MessageRepository;
import com.sayhii.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final UserService userService;

    @Transactional
    public ChatRoomResponse createRoom(ChatRoomRequest request, User currentUser) {
        // For PRIVATE rooms, verify and check for duplicate
        if (request.getRoomType() == RoomType.PRIVATE) {
            if (request.getMemberIds() == null || request.getMemberIds().size() != 1) {
                throw new IllegalArgumentException("Private rooms must have exactly one recipient");
            }

            Long otherUserId = request.getMemberIds().get(0);

            if (otherUserId.equals(currentUser.getId())) {
                throw new IllegalArgumentException("Cannot create a private chat with yourself");
            }

            chatRoomRepository.findPrivateRoom(currentUser.getId(), otherUserId, RoomType.PRIVATE)
                    .ifPresent(room -> {
                        throw new DuplicateResourceException("Private chat room already exists with this user");
                    });
        }

        ChatRoom chatRoom = ChatRoom.builder()
                .name(request.getName())
                .roomType(request.getRoomType())
                .createdBy(currentUser)
                .build();

        chatRoom = chatRoomRepository.save(chatRoom);

        // Add creator as member
        ChatRoomMember creatorMember = ChatRoomMember.builder()
                .chatRoom(chatRoom)
                .user(currentUser)
                .build();
        chatRoomMemberRepository.save(creatorMember);
        chatRoom.getMembers().add(creatorMember);

        // Add recipient / participants
        for (Long memberId : request.getMemberIds()) {
            if (!memberId.equals(currentUser.getId())) {
                User member = userRepository.findById(memberId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + memberId));

                ChatRoomMember roomMember = ChatRoomMember.builder()
                        .chatRoom(chatRoom)
                        .user(member)
                        .build();
                chatRoomMemberRepository.save(roomMember);
                chatRoom.getMembers().add(roomMember);
            }
        }

        return mapToResponse(chatRoom);
    }

    public List<ChatRoomResponse> getUserRooms(Long userId) {
        return chatRoomRepository.findAllByMemberId(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ChatRoomResponse getRoomById(Long roomId, User currentUser) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with id: " + roomId));

        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, currentUser.getId())) {
            throw new ResourceNotFoundException("Chat room not found or access denied");
        }

        return mapToResponse(chatRoom);
    }

    public ChatRoomResponse mapToResponse(ChatRoom chatRoom) {
        MessageResponse lastMessage = messageRepository
                .findTopByChatRoomIdOrderByCreatedAtDesc(chatRoom.getId())
                .map(this::mapMessageToResponse)
                .orElse(null);

        return ChatRoomResponse.builder()
                .id(chatRoom.getId())
                .name(chatRoom.getName())
                .roomType(chatRoom.getRoomType())
                .createdById(chatRoom.getCreatedBy().getId())
                .members(chatRoom.getMembers().stream()
                        .map(member -> userService.mapToResponse(member.getUser()))
                        .collect(Collectors.toList()))
                .lastMessage(lastMessage)
                .createdAt(chatRoom.getCreatedAt())
                .build();
    }

    public MessageResponse mapMessageToResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .senderDisplayName(message.getSender().getDisplayName())
                .chatRoomId(message.getChatRoom().getId())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
