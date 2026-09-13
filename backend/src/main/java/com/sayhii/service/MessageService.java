package com.sayhii.service;

import com.sayhii.dto.request.MessageRequest;
import com.sayhii.dto.response.MessageResponse;
import com.sayhii.entity.ChatRoom;
import com.sayhii.entity.Message;
import com.sayhii.entity.User;
import com.sayhii.exception.ResourceNotFoundException;
import com.sayhii.repository.ChatRoomMemberRepository;
import com.sayhii.repository.ChatRoomRepository;
import com.sayhii.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;

    public MessageResponse saveMessage(MessageRequest request, User sender) {
        ChatRoom chatRoom = chatRoomRepository.findById(request.getChatRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with id: " + request.getChatRoomId()));

        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(chatRoom.getId(), sender.getId())) {
            throw new ResourceNotFoundException("You are not a member of this chat room");
        }

        Message message = Message.builder()
                .content(request.getContent())
                .messageType(request.getMessageType() != null ? request.getMessageType() : com.sayhii.enums.MessageType.TEXT)
                .sender(sender)
                .chatRoom(chatRoom)
                .build();

        message = messageRepository.save(message);

        return mapToResponse(message);
    }

    public Page<MessageResponse> getChatHistory(Long chatRoomId, int page, int size, User currentUser) {
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(chatRoomId, currentUser.getId())) {
            throw new ResourceNotFoundException("Chat room not found or access denied");
        }

        Pageable pageable = PageRequest.of(page, size);
        return messageRepository.findByChatRoomIdOrderByCreatedAtDesc(chatRoomId, pageable)
                .map(this::mapToResponse);
    }

    public MessageResponse mapToResponse(Message message) {
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
