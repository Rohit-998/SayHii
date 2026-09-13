"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Leaf, LoaderCircle, Plus, Search, X } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/ui";
import { useUserSearch } from "@/hooks/use-user-search";
import { dayLabel, displayName, otherUser, roomName, timeLabel } from "@/lib/chat-utils";
import type { Room, User } from "@/types/chat";

export function ChatSidebar({ rooms, roomId, user, busy, error, retry, onSelect, onNew, onProfile, onPerson }: {
  rooms: Room[]; roomId: number | null; user: User; busy: boolean; error: string;
  retry: () => void; onSelect: (id: number) => void; onNew: () => void; onProfile: () => void; onPerson: (user: User) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const search = useUserSearch(query);
  const visible = rooms.filter(room => roomName(room, user.id).toLowerCase().includes(query.trim().toLowerCase()) && (filter === "all" || (filter === "groups" ? !room.privateChat : (room.unreadCount || 0) > 0)));
  return <aside className="chat-sidebar" aria-label="Conversations">
    <div className="sidebar-top"><div className="sidebar-title"><h1>Conversations<span>.</span></h1><button className="new-button" aria-label="New conversation" title="New conversation" onClick={onNew}><Plus size={20} /></button></div><p>Your daily dose of together.</p>
      <div className="search-field"><Search size={17} /><input aria-label="Search conversations and users" placeholder="Find a conversation or a person" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</div>
      <div className="chat-filters" role="group" aria-label="Filter conversations">{[["all", "All chats"], ["unread", "Unread"], ["groups", "Groups"]].map(([value, label]) => <button className={clsx(filter === value && "active")} key={value} onClick={() => setFilter(value)}>{label}{value === "all" && <span>{rooms.length}</span>}</button>)}</div>
    </div>
    <div className="room-list" data-native-scroll>
      {error && <div className="inline-error" role="alert"><p>{error}</p><button className="text-button" onClick={retry}>Try again</button></div>}
      {busy && !rooms.length && <p className="empty-hint"><LoaderCircle className="spin" size={18} /> Opening your conversations...</p>}
      {!busy && !visible.length && <p className="empty-hint">{query ? "No matching conversations." : filter === "unread" ? "All caught up. A little peace and quiet." : filter === "groups" ? "Your next little circle starts here." : "It's quiet here. Start with a hello."}{!query && <button className="text-button" onClick={onNew}>Start a conversation <ArrowUpRight size={15} /></button>}</p>}
      {visible.map(room => {
        const name = roomName(room, user.id);
        const other = otherUser(room, user.id);
        const unread = (room.unreadCount || 0) > 0;
        return <button key={room.id} className={clsx("room-item", roomId === room.id && "selected")} aria-pressed={roomId === room.id} onClick={() => { onSelect(room.id); setQuery(""); }}>
          <Avatar name={name} id={other?.id || room.id} group={!room.privateChat} online={room.privateChat ? other?.online : undefined} />
          <span className="room-copy"><span className="room-title"><strong>{name}</strong>{room.lastMessage && <time dateTime={room.lastMessage.createdAt}>{dayLabel(room.lastMessage.createdAt) === "Today" ? timeLabel(room.lastMessage.createdAt) : dayLabel(room.lastMessage.createdAt)}</time>}</span>
            <span className="room-preview"><span>{room.lastMessage ? `${room.lastMessage.sender.id === user.id ? "You: " : !room.privateChat ? `${displayName(room.lastMessage.sender).split(" ")[0]}: ` : ""}${room.lastMessage.content}` : "Say the first hello"}</span>{unread && <b>{room.unreadCount}</b>}</span>
          </span>
        </button>;
      })}
      {query.trim() && <div className="sidebar-search-results"><span className="eyebrow">FIND PEOPLE</span>{search.busy ? <p className="empty-hint">Searching...</p> : search.results.filter(person => person.id !== user.id).map(person => <button className="person-result" key={person.id} onClick={() => onPerson(person)}><Avatar name={displayName(person)} id={person.id} online={person.online} /><span><strong>{displayName(person)}</strong><small>@{person.username}</small></span><Plus size={16} /></button>)}{!search.busy && !search.results.filter(person => person.id !== user.id).length && <p className="empty-hint">No users found by that username.</p>}{search.error && <p className="inline-error" role="alert">{search.error}</p>}</div>}
    </div>
    <div className="sidebar-note"><Leaf size={23} strokeWidth={1.3} /><p>A little hello.<br /><span>A lot of possibility.</span></p><span className="note-spark">+</span></div>
    <button className="my-profile" onClick={onProfile} aria-label="View your profile"><Avatar name={displayName(user)} id={user.id} online={user.online} /><span><strong>{displayName(user)}</strong><small>Your personal little space</small></span><ChevronDown size={17} /></button>
  </aside>;
}
