"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { makeDemo } from "@/lib/demo";
import { mergeMessages, sortRooms } from "@/lib/chat-utils";
import { useStomp } from "@/hooks/use-stomp";
import type { ChatMessage, Room } from "@/types/chat";

const errorText = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function useChatData() {
  const { token, user, isDemo } = useAuth();
  const [demo] = useState(makeDemo);
  const [rooms, setRooms] = useState<Room[]>(isDemo ? demo.rooms : []);
  const [roomId, setRoomId] = useState<number | null>(isDemo ? 11 : null);
  const selected = useRef(roomId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomsBusy, setRoomsBusy] = useState(!isDemo);
  const [roomsError, setRoomsError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [roomsVersion, setRoomsVersion] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const page = useRef(-1);
  const historyRequest = useRef<AbortController | null>(null);
  const paging = useRef(false);
  const liveMessages = useRef<ChatMessage[]>([]);

  function selectRoom(id: number) {
    selected.current = id;
    setRoomId(id);
    setRooms(current => current.map(room => room.id === id ? { ...room, unreadCount: 0 } : room));
  }

  useEffect(() => {
    if (isDemo || !token) return;
    const controller = new AbortController();
    let running = false;
    async function refresh(initial = false) {
      if (running || (!initial && document.hidden)) return;
      running = true;
      if (initial) setRoomsBusy(true);
      try {
        const data = await api.rooms(token!, controller.signal);
        if (controller.signal.aborted) return;
        setRooms(current => sortRooms(data.map(room => {
          const existing = current.find(item => item.id === room.id);
          return existing?.lastMessage && Date.parse(existing.lastMessage.createdAt) > Date.parse(room.lastMessage?.createdAt || "1970-01-01")
            ? { ...room, lastMessage: existing.lastMessage } : room;
        })));
        if (selected.current === null && data.length) { selected.current = data[0].id; setRoomId(data[0].id); }
        setRoomsError("");
      } catch (error) { if (!controller.signal.aborted) setRoomsError(errorText(error)); }
      finally { if (!controller.signal.aborted) setRoomsBusy(false); running = false; }
    }
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 30_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [token, isDemo, roomsVersion]);

  useEffect(() => {
    selected.current = roomId;
    historyRequest.current?.abort();
    liveMessages.current = [];
    page.current = -1;
    paging.current = false;
    setHistoryError("");
    setHasMore(false);
    setMessages(isDemo && roomId !== null ? demo.messages[roomId] || [] : []);
    if (isDemo || !token || roomId === null) { setHistoryBusy(false); return; }
    const controller = new AbortController();
    historyRequest.current = controller;
    paging.current = true;
    setHistoryBusy(true);
    api.messages(token, roomId, 0, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setMessages(mergeMessages(data.content, liveMessages.current));
      page.current = 0;
      setHasMore(!data.last);
    }).catch(error => { if (!controller.signal.aborted) setHistoryError(errorText(error)); })
      .finally(() => { if (!controller.signal.aborted) { paging.current = false; setHistoryBusy(false); } });
    return () => { controller.abort(); historyRequest.current?.abort(); };
  }, [roomId, token, isDemo, demo, historyVersion]);

  function receive(message: ChatMessage) {
    if (message.chatRoomId !== selected.current) return;
    liveMessages.current = mergeMessages(liveMessages.current, [message]);
    setMessages(current => mergeMessages(current, [message]));
    setRooms(current => sortRooms(current.map(room => room.id === message.chatRoomId ? { ...room, lastMessage: message } : room)));
  }

  const socket = useStomp({ token, roomId, onMessage: receive });
  useEffect(() => {
    if (isDemo || !token || roomId === null || socket.status !== "connected") return;
    // Reconcile after connecting/reconnecting so messages sent during a gap are not lost.
    const controller = new AbortController();
    api.messages(token, roomId, 0, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      liveMessages.current = mergeMessages(liveMessages.current, data.content);
      setMessages(current => mergeMessages(current, data.content));
    }).catch(() => { /* The paginated history request displays actionable errors. */ });
    return () => controller.abort();
  }, [socket.status, roomId, token, isDemo]);

  async function loadOlder() {
    if (isDemo || !token || roomId === null || paging.current || !hasMore) return;
    const controller = new AbortController();
    historyRequest.current = controller;
    paging.current = true;
    setHistoryBusy(true);
    setHistoryError("");
    try {
      const next = page.current + 1;
      const data = await api.messages(token, roomId, next, controller.signal);
      if (controller.signal.aborted || selected.current !== roomId) return;
      setMessages(current => mergeMessages(data.content, current));
      page.current = next;
      setHasMore(!data.last);
    } catch (error) { if (!controller.signal.aborted) setHistoryError(errorText(error)); }
    finally { if (!controller.signal.aborted) { paging.current = false; setHistoryBusy(false); } }
  }

  function send(content: string) {
    if (!content.trim() || roomId === null || !user) return false;

    const tempId = -Date.now();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatRoomId: roomId,
      sender: user,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      messageType: "TEXT",
      status: "sending",
    };

    // Immediately append optimistic message to conversation
    setMessages(current => mergeMessages(current, [optimisticMessage]));
    setRooms(current => sortRooms(current.map(room => room.id === roomId ? { ...room, lastMessage: optimisticMessage } : room)));

    if (isDemo) {
      window.setTimeout(() => {
        setMessages(current => current.map(m => m.id === tempId ? { ...m, status: "sent" } : m));
      }, 350);
      return true;
    }

    // Set timeout to mark as failed if server doesn't respond in 12s
    const failTimer = window.setTimeout(() => {
      setMessages(current => current.map(m => (m.id === tempId && m.status === "sending") ? { ...m, status: "failed" } : m));
    }, 12000);

    const sentOverSocket = socket.send(content.trim());
    if (sentOverSocket) {
      return true;
    }

    // Fallback to HTTP REST if WebSocket is temporarily reconnecting
    if (token) {
      api.sendMessage(token, roomId, content.trim())
        .then(savedMessage => {
          window.clearTimeout(failTimer);
          if (savedMessage) receive(savedMessage);
        })
        .catch(() => {
          window.clearTimeout(failTimer);
          setMessages(current => current.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
        });
      return true;
    }

    window.clearTimeout(failTimer);
    setMessages(current => current.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
    return false;
  }

  function retryMessage(message: ChatMessage) {
    if (roomId === null || !user || !message.content) return;
    setMessages(current => current.map(m => m.id === message.id ? { ...m, status: "sending" } : m));

    const failTimer = window.setTimeout(() => {
      setMessages(current => current.map(m => (m.id === message.id && m.status === "sending") ? { ...m, status: "failed" } : m));
    }, 12000);

    const sentOverSocket = socket.send(message.content);
    if (sentOverSocket) return;

    if (token) {
      api.sendMessage(token, roomId, message.content)
        .then(savedMessage => {
          window.clearTimeout(failTimer);
          if (savedMessage) receive(savedMessage);
        })
        .catch(() => {
          window.clearTimeout(failTimer);
          setMessages(current => current.map(m => m.id === message.id ? { ...m, status: "failed" } : m));
        });
    } else {
      window.clearTimeout(failTimer);
      setMessages(current => current.map(m => m.id === message.id ? { ...m, status: "failed" } : m));
    }
  }

  function addRoom(room: Room) {
    setRooms(current => sortRooms([room, ...current.filter(item => item.id !== room.id)]));
    selectRoom(room.id);
  }

  return {
    rooms, room: rooms.find(item => item.id === roomId) || null, roomId, selectRoom, addRoom,
    messages, roomsBusy, roomsError, retryRooms: () => setRoomsVersion(value => value + 1),
    historyBusy, historyError, hasMore, loadOlder,
    retryHistory: () => page.current < 0 ? setHistoryVersion(value => value + 1) : void loadOlder(),
    send, retryMessage, connection: isDemo ? "demo" as const : socket.status,
  };
}
