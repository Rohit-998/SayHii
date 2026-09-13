import type { MessagePage, RegisterInput, Room, User } from "../types/chat";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
export const SOCKJS_URL = process.env.NEXT_PUBLIC_SOCKJS_URL || `${API_URL}/ws`;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function statusMessage(status: number, authenticated: boolean): string {
  switch (status) {
    case 400:
    case 422:
      return "Please check your information and try again.";
    case 401:
      return authenticated
        ? "Your session has expired. Please sign in again."
        : "Authentication failed. Check your details and try again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "The requested item could not be found.";
    case 409:
      return "This request conflicts with existing information.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    default:
      return status >= 500
        ? "The server is temporarily unavailable. Please try again."
        : "The request could not be completed. Please try again.";
  }
}

async function request<T>(
  path: string,
  { token, method = "GET", body, signal }: {
    token?: string;
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: "omit",
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new ApiError(0, "Unable to reach the server. Check your connection and try again.");
  }

  signal?.throwIfAborted();
  if (!response.ok) {
    if (response.status === 401 && token && typeof window !== "undefined") {
      // Identify the rejected token so a late response cannot sign out a newer session.
      window.dispatchEvent(new CustomEvent("sayhii:unauthorized", { detail: { token } }));
    }
    throw new ApiError(response.status, statusMessage(response.status, Boolean(token)));
  }
  if (response.status === 204) return undefined as T;

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new ApiError(0, "The response was interrupted. Please try again.");
  }
  signal?.throwIfAborted();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "The server returned an invalid response. Please try again.");
  }
}

export const api = {
  me: (token: string, signal?: AbortSignal) => request<User>("/api/users/me", { token, signal }),
  rooms: (token: string, signal?: AbortSignal) => request<Room[]>("/api/rooms", { token, signal }),
  searchUsers: (token: string, query: string, signal?: AbortSignal) =>
    request<User[]>(`/api/users/search?${new URLSearchParams({ query })}`, { token, signal }),
  messages: (token: string, roomId: number, page: number, signal?: AbortSignal) =>
    request<MessagePage>(`/api/messages/${roomId}?page=${page}&size=50`, { token, signal }),
  async login(input: { username: string; password: string }): Promise<{ token: string }> {
    const result = await request<{ token: string }>("/api/auth/login", { method: "POST", body: input });
    if (!result || typeof result.token !== "string" || !result.token.trim()) {
      throw new ApiError(200, "The server returned an invalid sign-in response. Please try again.");
    }
    return { token: result.token };
  },
  async register(input: RegisterInput): Promise<void> {
    await request<void>("/api/auth/register", { method: "POST", body: input });
  },
  createPrivate: (token: string, userId: number) =>
    request<Room>("/api/rooms/private", { token, method: "POST", body: { userId } }),
  createGroup: (token: string, name: string, memberIds: number[]) =>
    request<Room>("/api/rooms/group", { token, method: "POST", body: { name, memberIds } }),
};
