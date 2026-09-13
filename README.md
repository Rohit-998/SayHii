# SayHii (Syahi) - Real-Time Chat Application

SayHii is a full-stack real-time messaging application built with Spring Boot and Next.js. It implements bidirectional communication through WebSockets using the STOMP protocol, secured by Spring Security and JWT, with persistent storage in PostgreSQL and MySQL-compatible schemas.

The project features optimistic UI updates, background tab presence management, private and group conversations, and OAuth synchronization.

---

## Architecture overview

The system uses a decoupled client-server architecture:

```
[ Next.js Client ]
  |
  +-- HTTPS / REST ----> Spring Boot Controllers ---> Service Layer ---> Spring Data JPA ---> PostgreSQL (Supabase)
  |                                                          |
  +-- WSS / STOMP ------> Simple Message Broker <------------+
```

1. **Client layer**: Next.js App Router with TypeScript, Tailwind CSS, Framer Motion, and native WebSocket handling via `@stomp/stompjs` and SockJS.
2. **API and security layer**: Spring Boot REST controllers secured with stateless JWT filter chains and BCrypt password encryption.
3. **Messaging layer**: Spring WebSocket message broker handling STOMP frames over `/app` and `/topic` destinations with interceptor authentication.
4. **Data layer**: Spring Data JPA with Hibernate, utilizing EntityGraphs for eager join fetching to prevent N+1 queries.

---

## Technology stack

### Backend
- Language: Java 21
- Framework: Spring Boot 4.1.1
- Security: Spring Security 6, JJWT (io.jsonwebtoken 0.12.6)
- Messaging: Spring WebSocket, STOMP, SockJS
- Database access: Spring Data JPA, Hibernate ORM
- Database: PostgreSQL (Supabase Session Pooler over SSL) / MySQL compatible
- Testing: JUnit 5, Mockito, H2 in-memory test database
- Build tool: Apache Maven (wrapper included)
- Containerization: Docker (multi-stage build)

### Frontend
- Framework: Next.js 16 (App Router)
- Language: TypeScript 5
- UI and styling: Tailwind CSS, Vanilla CSS design tokens
- Animation: Framer Motion, GSAP, Lenis
- Real-time client: `@stomp/stompjs`, `sockjs-client`
- Social authentication: Supabase Auth SDK (GitHub and Google OAuth)
- Icons: Lucide React

---

## Key features

### Real-time messaging
- Bidirectional STOMP communication over `/ws` with automatic transport negotiation (WebSocket with SockJS fallback).
- Room-based channel routing with `/topic/room.{roomId}`.
- Optimistic UI delivery: messages display immediately in the chat window with a pending clock indicator, transitioning to a checkmark upon server persistence, or an alert icon with retry actions if network interruption occurs.
- HTTP REST fallback: clients automatically route messages through `POST /api/messages` if WebSocket handshakes are delayed or reconnecting.

### Security and authentication
- Stateless JWT authentication via `JwtAuthenticationFilter` with automatic context clearing on expired or malformed tokens.
- Dual authentication pathways: traditional username/password registration with BCrypt hashing, and external OAuth via GitHub and Google.
- Channel interceptors validate authorization headers on incoming STOMP CONNECT frames, attaching authenticated security principals to user sessions.

### Performance and data integrity
- Hibernate N+1 query elimination: message queries and room lists use `@EntityGraph` annotations to fetch relations in single SQL joins.
- Declarative transaction boundaries using `@Transactional` and read-only annotations across service methods.
- Real-time user presence: `WebSocketEventListener` handles `SessionConnectedEvent` and `SessionDisconnectEvent` to track online availability and broadcast updates across public channels.

---

## REST API specification

### Authentication

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user account | Public |
| POST | `/api/auth/login` | Authenticate with credentials and receive JWT | Public |
| POST | `/api/auth/oauth-login` | Synchronize OAuth user and issue JWT | Public |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/users/me` | Fetch authenticated user profile | Authenticated |
| GET | `/api/users/{id}` | Fetch user by ID | Authenticated |
| GET | `/api/users/search?query={q}` | Search users by username or display name | Authenticated |

### Conversations and rooms

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/rooms` | List all conversation rooms for current user | Authenticated |
| GET | `/api/rooms/{id}` | Fetch room details by ID | Authenticated |
| POST | `/api/rooms/private` | Create or fetch existing 1-on-1 private chat | Authenticated |
| POST | `/api/rooms/group` | Create a multi-user group chat | Authenticated |

### Messages

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/messages/{roomId}?page=0&size=50` | Get paginated chat history for a room | Authenticated |
| POST | `/api/messages` | Send message via REST with WebSocket broadcast | Authenticated |

### System health

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/health` | Uptime check returning status 200 | Public |
| GET | `/health` | Root health check alias | Public |

---

## WebSocket destinations

- **Handshake endpoint**: `/ws` (supports raw WebSocket and SockJS)
- **Application prefix**: `/app`
- **Topic broker prefix**: `/topic`
- **Send message mapping**: `/app/chat.sendMessage`
- **Room subscription channel**: `/topic/room.{roomId}`
- **System presence channel**: `/topic/public`

---

## Local development setup

### Prerequisites
- Java Development Kit (JDK) 21 or later
- Node.js 18 or later and npm
- PostgreSQL database instance (or local Docker container)

### 1. Clone repository
```bash
git clone https://github.com/Rohit-998/SayHii.git
cd SayHii
```

### 2. Backend configuration
The backend reads production credentials from environment variables. For local development, create an untracked properties file:

`backend/src/main/resources/application-local.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/sayhii
spring.datasource.username=postgres
spring.datasource.password=your_local_password
jwt.secret=your_base64_encoded_256bit_secret_key
```

Run the backend application:
```bash
cd backend
./mvnw clean spring-boot:run
```
The server starts on port `8080`.

### 3. Frontend configuration
Create your local environment file:

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SOCKJS_URL=http://localhost:8080/ws
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Install dependencies and start development server:
```bash
cd frontend
npm install
npm run dev
```
The frontend is available at `http://localhost:3000`.

---

## Running automated tests

### Backend test suite
Executes unit tests, Spring context integration, and database mapping verification:
```bash
cd backend
./mvnw test
```

### Frontend build verification
Validates TypeScript typings, component interfaces, and Next.js production packaging:
```bash
cd frontend
npm run build
```

---

## Deployment

- **Backend**: Containerized using multi-stage Docker build, deployed on Render Web Services.
- **Frontend**: Static and server-rendered deployment on Vercel Edge Network.
- **Database**: PostgreSQL on Supabase Cloud with SSL connection pooling.

---

## License
This project is open source and available under the [MIT License](LICENSE).
