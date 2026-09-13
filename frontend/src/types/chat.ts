export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  online: boolean;
}

export interface ChatMessage {
  id: number;
  content: string;
  chatRoomId: number;
  sender: User;
  createdAt: string;
  messageType: "TEXT";
  status?: "sending" | "sent" | "failed";
}

export interface Room {
  id: number;
  name: string | null;
  privateChat: boolean;
  members: User[];
  lastMessage: ChatMessage | null;
  unreadCount?: number;
}

export interface MessagePage {
  content: ChatMessage[];
  number: number;
  last: boolean;
  totalElements: number;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}
