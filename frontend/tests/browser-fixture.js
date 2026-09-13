// Browser-only integration fixture. Never imported by the app or preview.
(() => {
  const me = { id: 1, username: "testuser", displayName: "Test User", email: "test@example.com", online: true };
  const other = { id: 2, username: "olivia", displayName: "Olivia Bennett", email: "olivia@example.com", online: true };
  const third = { id: 3, username: "ethan", displayName: "Ethan Park", email: "ethan@example.com", online: false };
  const messages = Array.from({ length: 75 }, (_, index) => ({ id: index + 1, chatRoomId: 101, sender: index % 3 ? other : me, content: `History message ${index + 1}`, createdAt: new Date(Date.now() - (75 - index) * 60000).toISOString(), messageType: "TEXT" }));
  const rooms = [
    { id: 101, name: null, privateChat: true, members: [me, other], lastMessage: messages.at(-1) },
    { id: 102, name: null, privateChat: true, members: [me, third], lastMessage: null },
  ];
  const fixture = window.__sayhiiTest = { me, other, rooms, messages, requests: [], frames: [], sockets: [], mode: "ok" };
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin !== "http://localhost:8080") return originalFetch(input, options);
    fixture.requests.push({ path: url.pathname + url.search, method: options.method, headers: options.headers, body: options.body });
    await new Promise(resolve => setTimeout(resolve, 40));
    options.signal?.throwIfAborted();
    if (fixture.mode === "offline") throw new TypeError("Network unavailable");
    if (url.pathname === "/api/auth/register") return new Response(null, { status: 204 });
    if (url.pathname === "/api/auth/login") {
      const data = JSON.parse(options.body);
      return data.password === "password123" ? Response.json({ token: "sayhii-test-token" }) : new Response(null, { status: 401 });
    }
    if (fixture.mode === "unauthorized" || options.headers.Authorization !== "Bearer sayhii-test-token") return new Response(null, { status: 401 });
    if (url.pathname === "/api/users/me") return Response.json(me);
    if (url.pathname === "/api/rooms") return Response.json(rooms);
    if (url.pathname === "/api/users/search") return Response.json([other, third].filter(person => person.username.includes(url.searchParams.get("query"))));
    if (url.pathname.startsWith("/api/messages/")) {
      const id = Number(url.pathname.split("/").at(-1));
      const page = Number(url.searchParams.get("page"));
      const list = messages.filter(message => message.chatRoomId === id).slice().reverse();
      return Response.json({ content: list.slice(page * 50, (page + 1) * 50), number: page, last: list.length <= (page + 1) * 50, totalElements: list.length });
    }
    if (url.pathname === "/api/rooms/private" || url.pathname === "/api/rooms/group") {
      const body = JSON.parse(options.body);
      const group = url.pathname.endsWith("group");
      const room = { id: Date.now(), name: group ? body.name : null, privateChat: !group, members: [me, ...[other, third].filter(person => group ? body.memberIds.includes(person.id) : person.id === body.userId)], lastMessage: null };
      rooms.push(room);
      return Response.json(room, { status: 201 });
    }
    return new Response(null, { status: 404 });
  };

  class MockXHR {
    withCredentials = false;
    readyState = 0;
    status = 0;
    responseText = "";
    open(method, url) { this.url = url; this.readyState = 1; }
    setRequestHeader() {}
    getResponseHeader() { return "application/json"; }
    getAllResponseHeaders() { return "content-type: application/json\r\n"; }
    abort() { this.aborted = true; }
    send() {
      setTimeout(() => {
        if (this.aborted) return;
        this.status = 200;
        this.responseText = JSON.stringify({ websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 1234 });
        this.readyState = 4;
        this.onreadystatechange?.();
        this.onload?.();
      }, 15);
    }
  }
  window.XMLHttpRequest = MockXHR;
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    subscriptions = new Map();
    constructor(url) {
      this.url = url;
      fixture.sockets.push(this);
      setTimeout(() => { this.readyState = 1; this.onopen?.({}); this.onmessage?.({ data: "o" }); }, 15);
    }
    frame(body) { this.onmessage?.({ data: `a${JSON.stringify([body])}` }); }
    send(data) {
      for (const frame of JSON.parse(data)) {
        fixture.frames.push(frame);
        const head = frame.split("\n\n")[0];
        const headers = Object.fromEntries(head.split("\n").slice(1).filter(Boolean).map(line => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)]));
        if (frame.startsWith("CONNECT\n")) setTimeout(() => this.frame("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000"), 15);
        if (frame.startsWith("SUBSCRIBE\n")) this.subscriptions.set(headers.id, headers.destination);
        if (frame.startsWith("UNSUBSCRIBE\n")) this.subscriptions.delete(headers.id);
        if (frame.startsWith("SEND\n")) {
          const payload = JSON.parse(frame.slice(frame.indexOf("\n\n") + 2).replace(/\u0000$/, ""));
          const message = { ...payload, id: Date.now(), sender: me, createdAt: new Date().toISOString() };
          messages.push(message);
          setTimeout(() => this.deliver(message), 25);
        }
        if (frame.startsWith("DISCONNECT\n")) {
          if (headers.receipt) this.frame(`RECEIPT\nreceipt-id:${headers.receipt}\n\n\u0000`);
          this.close();
        }
      }
    }
    deliver(message) {
      for (const [id, destination] of this.subscriptions) {
        if (destination === `/topic/room.${message.chatRoomId}`) this.frame(`MESSAGE\nsubscription:${id}\ndestination:${destination}\nmessage-id:${message.id}\n\n${JSON.stringify(message)}\u0000`);
      }
    }
    close() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({ code: 1000, reason: "Test close", wasClean: true }); }
  }
  window.WebSocket = MockWebSocket;
})();
