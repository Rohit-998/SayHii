import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeMessages, roomName, sortRooms } from "../src/lib/chat-utils";
import { makeDemo, demoUser } from "../src/lib/demo";

test("merges history and live events by id and sorts chronologically", () => {
  const { messages } = makeDemo();
  const data = messages[11];
  const updated = { ...data[2], content: "Updated content" };
  const merged = mergeMessages([...data].reverse(), [updated, data[0]]);
  assert.equal(merged.length, data.length);
  assert.equal(merged[2].content, "Updated content");
  assert.deepEqual(merged.map(message => message.id), data.map(message => message.id));
});

test("uses the other member's display name for private rooms and group names otherwise", () => {
  const { rooms } = makeDemo();
  assert.equal(roomName(rooms[0], demoUser.id), "Olivia Bennett");
  assert.equal(roomName(rooms[1], demoUser.id), "The weekend people");
});

test("sorts rooms by latest activity without mutating input", () => {
  const { rooms } = makeDemo();
  const reversed = [...rooms].reverse();
  const sorted = sortRooms(reversed);
  assert.equal(sorted[0].id, 11);
  assert.equal(reversed[0].id, 16);
});
