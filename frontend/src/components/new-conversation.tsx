"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, MessageCircle, Search, Users, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Modal } from "@/components/ui";
import { useUserSearch } from "@/hooks/use-user-search";
import { api } from "@/lib/api";
import { demoPeople } from "@/lib/demo";
import { displayName } from "@/lib/chat-utils";
import type { Room, User } from "@/types/chat";

export function NewConversation({ onClose, onCreated, initialUser, rooms }: { onClose: () => void; onCreated: (room: Room) => void; initialUser?: User; rooms: Room[] }) {
  const { user, token, isDemo } = useAuth();
  const [group, setGroup] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<User[]>(initialUser ? [initialUser] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const search = useUserSearch(query);
  const people = query.trim() ? search.results : isDemo ? demoPeople : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || busy || !selected.length || (group && !name.trim())) return;
    setBusy(true); setError("");
    try {
      let room = !group ? rooms.find(item => item.privateChat && item.members.some(member => member.id === selected[0].id)) : undefined;
      if (!room) room = isDemo
        ? { id: Date.now(), name: group ? name.trim() : null, privateChat: !group, members: [user, ...selected], lastMessage: null }
        : group ? await api.createGroup(token!, name.trim(), selected.map(person => person.id)) : await api.createPrivate(token!, selected[0].id);
      onCreated(room); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "We couldn't create your conversation. Try again."); }
    finally { setBusy(false); }
  }

  return <Modal title="Start with a hello." subtitle="Find your person. Or bring your people together." onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <div className="segmented"><button className={clsx(!group && "active")} type="button" disabled={busy} onClick={() => { setGroup(false); setSelected(current => current.slice(0, 1)); }}><MessageCircle size={16} /> Private chat</button><button className={clsx(group && "active")} type="button" disabled={busy} onClick={() => setGroup(true)}><Users size={16} /> Group chat</button></div>
      {group && <label className="group-name">Group name<input value={name} onChange={event => setName(event.target.value)} placeholder="Give your circle a name" maxLength={80} required disabled={busy} /></label>}
      <div className="search-field"><Search size={17} /><input aria-label="Find people by username" placeholder="Search by username..." value={query} onChange={event => setQuery(event.target.value)} disabled={busy} /></div>
      {selected.length > 0 && <div className="selected-people">{selected.map(person => <button type="button" key={person.id} disabled={busy} onClick={() => setSelected(current => current.filter(item => item.id !== person.id))}>{displayName(person)}<X size={13} /></button>)}</div>}
      <div className="people-results" data-native-scroll>
        {search.busy ? <p className="empty-hint"><LoaderCircle className="spin" size={16} /> Finding your people...</p> : people.map(person => <button key={person.id} type="button" className="person-result" disabled={busy} onClick={() => setSelected(current => current.some(item => item.id === person.id) ? current.filter(item => item.id !== person.id) : group ? [...current, person] : [person])}>
          <Avatar name={displayName(person)} id={person.id} online={person.online} /><span><strong>{displayName(person)}</strong><small>@{person.username}</small></span><span className={clsx("select-circle", selected.some(item => item.id === person.id) && "checked")}>{selected.some(item => item.id === person.id) && <Check size={13} />}</span>
        </button>)}
        {!search.busy && !people.length && <p className="empty-hint">{query.trim() ? "No users found. Try another username." : "Search for a username to get started."}</p>}
        {search.error && <p className="inline-error" role="alert">{search.error}</p>}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button primary w-full" type="submit" disabled={busy || !selected.length || (group && !name.trim())}>{busy ? <LoaderCircle className="spin" size={18} /> : <>{group ? "Create group" : "Start conversation"}<ArrowRight size={17} /></>}</button>
      {isDemo && <p className="demo-note">Demo only. Conversations stay in this preview session.</p>}
    </form>
  </Modal>;
}
