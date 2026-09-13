import type { ChatMessage, Room, User } from "@/types/chat";

export const displayName = (user: User) => user.displayName?.trim() || user.username;
export const otherUser = (room: Room, userId: number) => room.members.find(member => member.id !== userId);
export const roomName = (room: Room, userId: number) => room.privateChat ? (otherUser(room, userId) ? displayName(otherUser(room, userId)!) : "Private conversation") : room.name || "Group conversation";
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
export const timeLabel = (date: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(date));
export const dayLabel = (date: string) => {
  const day = new Date(date);
  return day.toDateString() === new Date().toDateString() ? "Today" : day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const unique = new Map(existing.map(message => [message.id, message]));
  incoming.forEach(message => unique.set(message.id, message));
  return [...unique.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
}
export function sortRooms(rooms: Room[]) {
  return [...rooms].sort((a, b) => Date.parse(b.lastMessage?.createdAt || "1970-01-01") - Date.parse(a.lastMessage?.createdAt || "1970-01-01"));
}
