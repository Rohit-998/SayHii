import type { ChatMessage, Room, User } from "@/types/chat";

export const demoUser: User = { id: 1, username: "alex", displayName: "Alex Morgan", email: "alex@example.com", online: true };
export const demoPeople: User[] = [
  { id: 2, username: "olivia", displayName: "Olivia Bennett", email: "olivia@example.com", online: true },
  { id: 3, username: "ethan", displayName: "Ethan Park", email: "ethan@example.com", online: true },
  { id: 4, username: "sophia", displayName: "Sophia Chen", email: "sophia@example.com", online: false },
  { id: 5, username: "noah", displayName: "Noah Williams", email: "noah@example.com", online: false },
  { id: 6, username: "mia", displayName: "Mia Thompson", email: "mia@example.com", online: true },
  { id: 7, username: "leo", displayName: "Leo Martinez", email: "leo@example.com", online: false },
];
const stamp = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const message = (id: number, room: number, sender: User, content: string, minutes: number): ChatMessage => ({ id, chatRoomId: room, sender, content, createdAt: stamp(minutes), messageType: "TEXT" });

export function makeDemo() {
  const [olivia, ethan, sophia, noah, mia] = demoPeople;
  const messages: Record<number, ChatMessage[]> = {
    11: [
      message(1, 11, olivia, "Hey Alex! How's your morning going?", 28),
      message(2, 11, olivia, "I found the perfect little escape for this weekend. Think pine trees, fresh air, and absolutely no plans.", 27),
      message(3, 11, demoUser, "That sounds like exactly what I need. A little less screen time, a little more sky.", 24),
      message(4, 11, olivia, "Right? There's a cabin by the lake. We could bring coffee and watch the sunrise.", 22),
      message(5, 11, demoUser, "You had me at coffee. Count me in!", 19),
      message(6, 11, olivia, "Perfect. Some things are just better together.", 2),
    ],
    12: [message(20, 12, ethan, "Anyone up for a little weekend adventure?", 58), message(21, 12, mia, "Found a trail you'll love. Sending the details tonight!", 16)],
    13: [message(30, 13, ethan, "That playlist is so good. Been on repeat all day.", 42)],
    14: [message(40, 14, sophia, "Let's catch up over coffee this week?", 90)],
    15: [message(50, 15, noah, "Thanks for the recommendation!", 145)],
    16: [message(60, 16, mia, "Made it home. Such a lovely evening.", 240)],
  };
  const rooms: Room[] = [
    { id: 11, name: null, privateChat: true, members: [demoUser, olivia], lastMessage: messages[11].at(-1)! },
    { id: 12, name: "The weekend people", privateChat: false, members: [demoUser, olivia, ethan, mia], lastMessage: messages[12].at(-1)!, unreadCount: 2 },
    ...[ethan, sophia, noah, mia].map((user, index) => ({ id: 13 + index, name: null, privateChat: true, members: [demoUser, user], lastMessage: messages[13 + index].at(-1)!, unreadCount: index === 0 ? 1 : 0 })),
  ];
  return { rooms, messages };
}
