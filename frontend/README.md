# SayHii

A Next.js chat frontend inspired by misty forest scenery, rounded glass panels, and warm amber accents. Built with TypeScript, Tailwind CSS 4, Framer Motion, GSAP, Lenis, React Context, SockJS, and STOMP.

## Run locally

Requirements: Node.js 22 or newer and your Spring Boot backend on port 8080.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Sign in or create an account. The protected home page redirects signed-out users to `/login`.

Open http://localhost:3000/demo for the interactive, backend-free demo. Sample people, messages, and presence are clearly labeled. Demo changes last only until the page is reloaded. Demo mode never reads or changes a real JWT.

Defaults already point at your local backend. To change them, create `.env.local` using the values in `.env.example`, then restart the development server (or rebuild for production).

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SOCKJS_URL=http://localhost:8080/ws
```

SockJS takes an HTTP(S) endpoint and negotiates WebSocket transport itself. Passing `ws://localhost:8080/ws` directly to SockJS is not valid. For an HTTPS frontend, use an HTTPS backend/SockJS URL as well; browsers block insecure mixed content. `localhost` always means the machine running the browser.

## Features

- Login and registration, optional display name, password visibility toggle, and form validation.
- JWT stored as `sayhii.token` in localStorage; protected requests use `Authorization: Bearer <token>`.
- Profile verification on startup; expired-session and cross-tab sign-out handling.
- Private and group rooms, latest previews, timestamps, room filters, and debounced user search.
- Native message scrolling, 50-message pagination, history deduplication, and preserved scroll position when older messages load.
- Live STOMP subscriptions, automatic reconnect, heartbeat monitoring, and recent-history reconciliation.
- Multiline composer, emoji picker, loaded-message search, profile and member dialogs.
- Current messages right-aligned; other messages left-aligned, with sender and time.
- Mobile conversation navigation, accessible native modal focus management, keyboard controls, and reduced-motion support.
- GSAP background reveal, Framer Motion transitions, and Lenis for document scrolling. Chat scrolling remains native for reliable anchoring.

## Backend contract

The backend source and DTOs were not supplied. The existing GET endpoints and STOMP destinations below match the request. Authentication and room-creation POST routes are explicit assumptions, centralized in `src/lib/api.ts`; adapt that file and `src/types/chat.ts` if your controllers differ. There is no speculative support for alternate response shapes.

| Method | Route | Body / Response |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ username, email, password, displayName? }`; 200/201/204 success |
| POST | `/api/auth/login` | `{ username, password }`; returns `{ token: string }` |
| GET | `/api/users/me` | `User` |
| GET | `/api/rooms` | `Room[]` |
| GET | `/api/users/search?query=olivia` | `User[]` |
| POST | `/api/rooms/private` | `{ userId: number }`; returns `Room` |
| POST | `/api/rooms/group` | `{ name: string, memberIds: number[] }`; returns `Room` |
| GET | `/api/messages/{roomId}?page=0&size=50` | Spring-style `MessagePage`, newest page first |

```ts
interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  online: boolean;
}

interface ChatMessage {
  id: number;
  content: string;
  chatRoomId: number;
  sender: User;
  createdAt: string; // ISO 8601, with timezone, e.g. 2026-09-14T09:30:00Z
  messageType: "TEXT";
}

interface Room {
  id: number;
  name: string | null;
  privateChat: boolean;
  members: User[];
  lastMessage: ChatMessage | null;
  unreadCount?: number;
}

interface MessagePage {
  content: ChatMessage[];
  number: number;
  last: boolean;
  totalElements: number;
}
```

IDs are numeric, as commonly returned by Spring `Long` IDs within JavaScript's safe integer range. A private room name is derived from the other member. The current user must be included in `members`. Group creation should add the authenticated user on the server; `memberIds` contains the selected other people.

Return message pages in descending creation order with a deterministic ID tie-breaker. The UI deduplicates by message ID and renders in chronological order. On reconnect it refreshes the newest 50 messages. A long outage can require re-opening the room to reset pagination and load a fully continuous history.

## WebSocket setup

Register `/ws` with SockJS enabled. Configure application destination prefix `/app` and broker prefix `/topic`.

- STOMP `CONNECT` includes `Authorization: Bearer <token>`.
- Subscribe to `/topic/room.{chatRoomId}` on selection; unsubscribe when switching rooms.
- Send to `/app/chat.sendMessage` with `{ content, chatRoomId, messageType: "TEXT" }`.
- Persist and broadcast the complete `ChatMessage` DTO to the room, including back to the sender.
- The frontend does not display optimistic messages as delivered. A sent message appears when the server broadcasts it. There are no read receipts or offline resend guarantees.
- The connection retries every four seconds with ten-second heartbeats.

Browsers and SockJS cannot add arbitrary `Authorization` headers to the initial WebSocket HTTP handshake. The JWT is carried in the STOMP CONNECT frame instead. Validate that frame in a Spring `ChannelInterceptor` and establish the authenticated principal. Configure `/ws/**` handshake/transport access accordingly; do not expect the normal HTTP JWT filter to read the STOMP header.

Authorize every `SUBSCRIBE` and `SEND` against room membership on the backend. Set sender, IDs, and timestamps server-side. Do not trust client-supplied user identity. Tokens are never put in URL query strings.

## CORS, presence, and errors

- Allow the frontend origin (default `http://localhost:3000`), GET/POST/OPTIONS, and `Authorization`/`Content-Type` headers. Configure allowed SockJS origins too.
- This is bearer-token auth with no cookie credentials. Login and registration cannot send a bearer token before one exists.
- `User.online` is supplied by the backend. Room membership/presence and inactive-room previews refresh every 30 seconds while the tab is visible, plus when returning to the tab. No undocumented presence topic is assumed.
- `unreadCount` is optional and backend-owned. Opening a room clears its badge locally; persistent read state needs a backend mark-read endpoint, which was not provided.
- Registration succeeds into a confirmation screen, then the user signs in. Registration does not assume the backend returns a JWT.
- Authentication failures, authorization failures, unreachable servers, invalid JSON, rate limits, and server errors have safe user-facing messages. Transient profile failures can be retried without deleting the token.
- The password form requires eight characters for registration. The backend remains responsible for its own validation and password hashing.
- Text messages only. Attachments, calls, typing events, account editing, password recovery, and read receipts are intentionally not simulated.

## Security note

JWT localStorage persistence is implemented as requested. It is accessible to JavaScript, so a production deployment should use a strong Content Security Policy, avoid untrusted scripts, and use short-lived tokens. No refresh-token flow was specified. The API enforces authorization; client route redirects are a UX guard, not a security boundary.

## Verify and build

```bash
npm test
npm run typecheck
npm run build
npm start
```

`tests/api.test.ts` verifies API routes, payloads, bearer headers, response handling, errors, and cancellation. `tests/chat-utils.test.ts` verifies message deduplication/order and room naming/order.

```bash
npm run preview:build
node scripts/build-preview.mjs --integration
```

The first command builds `../outputs/SayHii-preview.html` from the actual React components, with CSS, JavaScript, and the forest image embedded. Only Google Fonts needs internet; system sans-serif is the fallback. The download is a convenience preview, not a replacement for the Next.js project. Its navigation uses hash URLs instead of Next routing.

The second builds `.preview/integration.html` with a deterministic browser-only API/SockJS-transport fixture. This exercises the real STOMP client without a Spring server. The fixture is never imported by production routes or the regular preview. The test SockJS endpoint is HTTPS so it can run inside an HTTPS preview host; production defaults remain HTTP localhost.

The live Spring Boot integration cannot be certified without your backend. Check the contract above before connecting.

## Files

- `src/app`: routes, page metadata, shared styles.
- `src/components`: authentication, chat UI, modal, avatars, motion.
- `src/hooks`: room/history data, STOMP lifecycle, user search.
- `src/lib/api.ts`: REST adapter and backend URLs.
- `src/types/chat.ts`: exact backend DTO expectations.
- `src/lib/demo.ts`: isolated preview data.
- `public/forest.jpg`: bundled Unsplash forest photograph; attribution in `public/ASSETS.md`.

The screenshot was used as a visual reference; its branding and controls are not included.
