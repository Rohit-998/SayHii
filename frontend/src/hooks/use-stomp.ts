"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Client, type StompSubscription } from "@stomp/stompjs";
import { SOCKJS_URL } from "../lib/api";
import type { ChatMessage } from "../types/chat";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  const sender = message.sender;
  return typeof message.id === "number" && Number.isFinite(message.id)
    && typeof message.content === "string"
    && typeof message.chatRoomId === "number" && Number.isFinite(message.chatRoomId)
    && typeof message.createdAt === "string" && message.messageType === "TEXT"
    && !!sender && typeof sender === "object"
    && typeof sender.id === "number" && Number.isFinite(sender.id)
    && typeof sender.username === "string" && typeof sender.email === "string"
    && typeof sender.online === "boolean"
    && (sender.displayName === undefined || typeof sender.displayName === "string");
}

export function useStomp({ token, roomId, onMessage }: {
  token: string | null;
  roomId: number | null;
  onMessage: (message: ChatMessage) => void;
}): { status: ConnectionStatus; send(content: string): boolean } {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const clientRef = useRef<Client | null>(null);
  const subscription = useRef<StompSubscription | null>(null);
  const selectedRoom = useRef(roomId);
  const receive = useRef(onMessage);

  useEffect(() => { receive.current = onMessage; }, [onMessage]);

  const subscribe = useCallback(() => {
    const client = clientRef.current;
    if (subscription.current && client?.connected) {
      try { subscription.current.unsubscribe(); } catch { /* A closing socket may already be gone. */ }
    }
    subscription.current = null;
    const room = selectedRoom.current;
    if (!client?.connected || room === null) return;
    try {
      subscription.current = client.subscribe(`/topic/room.${room}`, (frame) => {
        if (clientRef.current !== client || selectedRoom.current !== room || !client.connected) return;
        try {
          const message: unknown = JSON.parse(frame.body);
          if (isChatMessage(message) && message.chatRoomId === room) receive.current(message);
        } catch { /* Ignore malformed frames without breaking the message stream. */ }
      });
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    selectedRoom.current = roomId;
    subscribe();
  }, [roomId, subscribe]);

  useEffect(() => {
    if (!token) {
      setStatus("disconnected");
      return;
    }
    let disposed = false;
    let client: Client | null = null;
    setStatus("connecting");
    void (async () => {
      // SockJS negotiates transports over HTTP(S); its endpoint must not use ws:// or wss://.
      if (!["http:", "https:"].includes(new URL(SOCKJS_URL).protocol)) throw new Error("Invalid SockJS URL");
      const { default: SockJS } = await import("sockjs-client");
      if (disposed) return;
      client = new Client({
        webSocketFactory: () => new SockJS(SOCKJS_URL),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 4000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        beforeConnect: () => { if (!disposed) setStatus("connecting"); },
        onConnect: () => {
          if (disposed) return;
          setStatus("connected");
          subscribe();
        },
        onWebSocketClose: () => {
          if (disposed) return;
          subscription.current = null;
          setStatus("disconnected");
        },
        onWebSocketError: () => { if (!disposed) setStatus("error"); },
        onStompError: () => { if (!disposed) setStatus("error"); },
      });
      clientRef.current = client;
      client.activate();
    })().catch(() => { if (!disposed) setStatus("error"); });

    return () => {
      disposed = true;
      if (clientRef.current === client) {
        if (client?.connected && subscription.current) {
          try { subscription.current.unsubscribe(); } catch { /* Continue teardown on transport failure. */ }
        }
        subscription.current = null;
        clientRef.current = null;
      }
      if (client) void client.deactivate().catch(() => {});
    };
  }, [token, subscribe]);

  const send = useCallback((content: string): boolean => {
    const client = clientRef.current;
    const chatRoomId = selectedRoom.current;
    if (!client?.connected || chatRoomId === null || !content.trim()) return false;
    try {
      client.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({ content, chatRoomId, messageType: "TEXT" }),
      });
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, []);

  return { status, send };
}
