package com.sayhii.repository;

import com.sayhii.entity.ChatRoom;
import com.sayhii.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT cr FROM ChatRoom cr JOIN cr.members m WHERE m.user.id = :userId")
    List<ChatRoom> findAllByMemberId(@Param("userId") Long userId);

    @Query("SELECT cr FROM ChatRoom cr JOIN cr.members m1 JOIN cr.members m2 " +
           "WHERE cr.roomType = :roomType AND m1.user.id = :userId1 AND m2.user.id = :userId2")
    Optional<ChatRoom> findPrivateRoom(@Param("userId1") Long userId1,
                                       @Param("userId2") Long userId2,
                                       @Param("roomType") RoomType roomType);
}
