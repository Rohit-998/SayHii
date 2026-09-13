import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { API_URL, SOCKJS_URL, ApiError, api } from "../src/lib/api";
import type { ChatMessage, MessagePage, Room, User } from "../src/types/chat";

const user: User = { id: 1, username: "alex", email: "alex@example.com", online: true };
const message: ChatMessage = {
  id: 10,
  content: "Hello",
  chatRoomId: 7,
  sender: user,
  createdAt: "2026-09-13T10:00:00Z",
  messageType: "TEXT",
};
const room: Room = { id: 7, name: null, privateChat: true, members: [user], lastMessage: message };
const page: MessagePage = { content: [message], number: 2, last: true, totalElements: 101 };

function mockWindow(t: TestContext): EventTarget {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  });
  return target;
}

test("base URLs use the configured values or localhost defaults", () => {
  assert.equal(API_URL, (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, ""));
  assert.equal(SOCKJS_URL, process.env.NEXT_PUBLIC_SOCKJS_URL || `${API_URL}/ws`);
});

test("protected GETs use exact paths, bearer auth, signals, and no cookies", async (t) => {
  const controller = new AbortController();
  const cases = [
    { path: "/api/users/me", result: user, run: () => api.me("jwt", controller.signal) },
    { path: "/api/rooms", result: [room], run: () => api.rooms("jwt", controller.signal) },
    { path: "/api/users/search?query=alex+%26+sam%2F%3F", result: [user], run: () => api.searchUsers("jwt", "alex & sam/?", controller.signal) },
    { path: "/api/messages/7?page=2&size=50", result: page, run: () => api.messages("jwt", 7, 2, controller.signal) },
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const expected = cases[index++];
    assert.equal(input, `${API_URL}${expected.path}`);
    assert.equal(init?.method, "GET");
    assert.equal(init?.signal, controller.signal);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.body, undefined);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer jwt");
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(headers.has("Content-Type"), false);
    return Response.json(expected.result);
  });
  for (const item of cases) assert.deepEqual(await item.run(), item.result);
  assert.equal(index, cases.length);
});

test("login posts credentials without bearer auth and returns only the token", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(input, `${API_URL}/api/auth/login`);
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.deepEqual(JSON.parse(init?.body as string), { username: "alex", password: "test-password" });
    const headers = new Headers(init?.headers);
    assert.equal(headers.has("Authorization"), false);
    assert.equal(headers.get("Content-Type"), "application/json");
    return Response.json({ token: "jwt", ignored: true });
  });
  assert.deepEqual(await api.login({ username: "alex", password: "test-password" }), { token: "jwt" });
});

test("registration posts the exact input, handles 204, and never logs in", async (t) => {
  const input = { username: "alex", email: "alex@example.com", password: "test-password", displayName: "Alex" };
  const fetchMock = t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, `${API_URL}/api/auth/register`);
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    assert.deepEqual(JSON.parse(init?.body as string), input);
    return new Response(null, { status: 204 });
  });
  assert.equal(await api.register(input), undefined);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("registration discards a JSON success body and accepts an empty success", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => ++calls === 1
    ? Response.json({ registered: true }, { status: 201 })
    : new Response(null, { status: 201 }));
  const input = { username: "alex", email: "alex@example.com", password: "test-password" };
  assert.equal(await api.register(input), undefined);
  assert.equal(await api.register(input), undefined);
  assert.equal(calls, 2);
});

test("room creation sends the specified bodies and bearer header", async (t) => {
  const requests = [
    { path: "/api/rooms/private", body: { userId: 2 } },
    { path: "/api/rooms/group", body: { name: "Team", memberIds: [2, 3] } },
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    const expected = requests[index++];
    assert.equal(url, `${API_URL}${expected.path}`);
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer jwt");
    assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(init?.body as string), expected.body);
    return Response.json(room, { status: 201 });
  });
  assert.deepEqual(await api.createPrivate("jwt", 2), room);
  assert.deepEqual(await api.createGroup("jwt", "Team", [2, 3]), room);
  assert.equal(index, 2);
});

test("only an authenticated 401 dispatches the unauthorized event", async (t) => {
  const target = mockWindow(t);
  const events: CustomEvent<{ token: string }>[] = [];
  target.addEventListener("sayhii:unauthorized", (event) => events.push(event as CustomEvent<{ token: string }>));
  t.mock.method(globalThis, "fetch", async () => new Response("sensitive backend details", { status: 401 }));
  await assert.rejects(api.me("expired-jwt"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.match(error.message, /session has expired/i);
    assert.doesNotMatch(error.message, /sensitive/);
    return true;
  });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].detail, { token: "expired-jwt" });
  await assert.rejects(api.login({ username: "alex", password: "wrong" }), ApiError);
  await assert.rejects(api.register({ username: "alex", email: "alex@example.com", password: "test-password" }), ApiError);
  await assert.rejects(api.me(""), ApiError);
  assert.equal(events.length, 1);
});

test("authenticated errors work without a browser window", async (t) => {
  assert.equal(typeof window, "undefined");
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  await assert.rejects(api.rooms("expired"), (error: unknown) => error instanceof ApiError && error.status === 401);
});

test("HTTP errors retain status and never expose backend text", async (t) => {
  let status = 400;
  let unauthorizedEvents = 0;
  mockWindow(t).addEventListener("sayhii:unauthorized", () => { unauthorizedEvents += 1; });
  t.mock.method(globalThis, "fetch", async () => new Response("private stack trace and secrets", { status }));
  for (status of [400, 403, 404, 409, 422, 429, 500, 503]) {
    await assert.rejects(api.rooms("jwt"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.name, "ApiError");
      assert.equal(error.status, status);
      assert.ok(error.message.length > 0);
      assert.doesNotMatch(error.message, /private|stack trace|secrets/);
      return true;
    });
  }
  assert.equal(unauthorizedEvents, 0);
});

test("network failures become safe status-zero ApiErrors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("internal proxy secret"); });
  await assert.rejects(api.rooms("jwt"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.match(error.message, /connection/i);
    assert.doesNotMatch(error.message, /proxy|secret/);
    return true;
  });
});

test("invalid JSON and missing login tokens produce safe errors", async (t) => {
  let response = new Response("not JSON");
  t.mock.method(globalThis, "fetch", async () => response);
  await assert.rejects(api.rooms("jwt"), (error: unknown) => error instanceof ApiError && error.status === 200);
  for (const result of [null, {}, { token: 42 }, { token: " " }]) {
    response = Response.json(result);
    await assert.rejects(api.login({ username: "alex", password: "test-password" }), ApiError);
  }
});

test("fetch aborts are preserved rather than converted to API errors", async (t) => {
  const controller = new AbortController();
  const reason = new DOMException("Canceled", "AbortError");
  controller.abort(reason);
  t.mock.method(globalThis, "fetch", async () => { throw reason; });
  await assert.rejects(api.me("jwt", controller.signal), (error: unknown) => error === reason);
});

test("an aborted stale response cannot dispatch an unauthorized event", async (t) => {
  let events = 0;
  mockWindow(t).addEventListener("sayhii:unauthorized", () => { events += 1; });
  const controller = new AbortController();
  const reason = new DOMException("Canceled", "AbortError");
  t.mock.method(globalThis, "fetch", async () => {
    controller.abort(reason);
    return new Response(null, { status: 401 });
  });
  await assert.rejects(api.me("old-jwt", controller.signal), (error: unknown) => error === reason);
  assert.equal(events, 0);
});

test("response body aborts are preserved", async (t) => {
  const reason = new DOMException("Canceled", "AbortError");
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { controller.error(reason); },
  })));
  await assert.rejects(api.rooms("jwt"), (error: unknown) => error === reason);
});

test("response body transport failures are safe errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error("sensitive transport error")); },
  })));
  await assert.rejects(api.rooms("jwt"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.doesNotMatch(error.message, /sensitive|transport error/);
    return true;
  });
});
