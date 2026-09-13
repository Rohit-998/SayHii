"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Check, Clock, Info, Leaf, LoaderCircle, Search, Send, Smile, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Avatar } from "@/components/ui";
import { dayLabel, displayName, otherUser, roomName, timeLabel } from "@/lib/chat-utils";
import type { ChatMessage, Room, User } from "@/types/chat";

export function MessageWindow({ room, user, messages, busy, error, hasMore, loadOlder, retry, onSend, onRetryMessage, connection, onBack, onDetails, visibleOnMobile }: {
  room: Room; user: User; messages: ChatMessage[]; busy: boolean; error: string; hasMore: boolean;
  loadOlder: () => Promise<void>; retry: () => void; onSend: (content: string) => boolean;
  onRetryMessage?: (message: ChatMessage) => void;
  connection: string; onBack: () => void; onDetails: () => void; visibleOnMobile: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newMessages, setNewMessages] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const initialScroll = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const name = roomName(room, user.id);
  const other = otherUser(room, user.id);
  const connected = connection === "connected" || connection === "demo";
  const shown = query.trim() ? messages.filter(message => message.content.toLowerCase().includes(query.trim().toLowerCase())) : messages;

  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    if (anchor.current) {
      element.scrollTop = anchor.current.top + element.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (nearBottom.current || initialScroll.current) {
      element.scrollTop = element.scrollHeight;
      if (messages.length) initialScroll.current = false;
      setNewMessages(false);
    } else setNewMessages(true);
  }, [messages]);

  useLayoutEffect(() => {
    if (visibleOnMobile && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight;
      nearBottom.current = true;
      setNewMessages(false);
    }
  }, [visibleOnMobile]);

  useEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (nearBottom.current && !anchor.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (error) anchor.current = null; }, [error]);

  useEffect(() => {
    const element = textarea.current;
    if (element) { element.style.height = "auto"; element.style.height = `${Math.min(element.scrollHeight, 128)}px`; }
  }, [draft, visibleOnMobile]);

  async function older() {
    if (!scroll.current || busy) return;
    anchor.current = { height: scroll.current.scrollHeight, top: scroll.current.scrollTop };
    await loadOlder();
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (onSend(text)) { setDraft(""); setSendError(""); setEmojiOpen(false); nearBottom.current = true; }
    else setSendError("Your message wasn't sent. Keep it here while we reconnect, then try again.");
  }

  return <section className="chat-window" aria-label={`Conversation with ${name}`}>
    <header className="conversation-header"><button className="icon-button mobile-back" aria-label="Back to conversations" onClick={onBack}><ArrowLeft size={21} /></button><Avatar name={name} id={other?.id || room.id} group={!room.privateChat} online={room.privateChat ? other?.online : undefined} /><div className="conversation-identity"><h2>{name}</h2><span>{room.privateChat ? <><i className={clsx("status-dot", other?.online && "online")} />{other?.online ? "Online now" : "Offline"}</> : <>{room.members.length} people, one little circle</>}</span></div><div className="conversation-actions"><button className={clsx("icon-button", searchOpen && "active")} aria-label="Search this conversation" aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setQuery(""); }}><Search size={19} /></button><span /><button className="icon-button" aria-label="Conversation details" onClick={onDetails}><Info size={19} /></button></div></header>
    {searchOpen && <div className="message-search"><Search size={16} /><input autoFocus aria-label="Search loaded messages" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search loaded messages..." /><span>{shown.length} found</span><button className="icon-button" aria-label="Close message search" onClick={() => { setSearchOpen(false); setQuery(""); }}><X size={16} /></button></div>}
    {!connected && <div className="connection-banner" role="status"><span className="status-dot" />{connection === "connecting" ? "Connecting to your conversations..." : "Connection interrupted. Reconnecting automatically. Your draft is safe."}</div>}
    <div ref={scroll} className="message-scroll" data-native-scroll onScroll={event => {
      const element = event.currentTarget;
      nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      if (nearBottom.current) setNewMessages(false);
      if (element.scrollTop < 65 && hasMore && !busy && !error && !query) void older();
    }}>
      <div className="conversation-beginning"><Leaf size={17} strokeWidth={1.4} /><span>{room.privateChat ? "A little space for the two of you." : "A little space for your people."}</span></div>
      {hasMore && !query && <button className="load-older" disabled={busy} onClick={() => void older()}>{busy ? <LoaderCircle className="spin" size={14} /> : <ArrowUp size={14} />} Load older messages</button>}
      {busy && !messages.length && <p className="empty-hint"><LoaderCircle size={20} className="spin" /> Opening your conversation...</p>}
      {error && <div className="inline-error" role="alert">{error}<button className="text-button" onClick={retry}>Try again</button></div>}
      {!busy && !shown.length && <div className="empty-conversation"><Send size={30} strokeWidth={1} /><h3>{query ? "No messages found." : "Every good thing starts with a hello."}</h3><p>{query ? "Try another phrase, or load more history." : `Say something to ${name.split(" ")[0]}. Make their day a little better.`}</p></div>}
      <div className="messages" role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions">
        {shown.map((message, index) => {
          const own = message.sender.id === user.id;
          const previous = shown[index - 1];
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          const sameSender = previous?.sender.id === message.sender.id && !newDay;
          return <div key={message.id}>
            {newDay && <div className="date-divider"><span /><time dateTime={message.createdAt}>{dayLabel(message.createdAt)}</time><span /></div>}
            <div className={clsx("message-row", own && "own", sameSender && "continued")}>
              {!own && <div className={clsx("message-avatar", sameSender && "invisible")}><Avatar name={displayName(message.sender)} id={message.sender.id} small /></div>}
              <div className="message-body">
                {!sameSender && <span className="message-sender">{own ? "You" : displayName(message.sender).split(" ")[0]}</span>}
                <div className="message-bubble">{message.content}</div>
                <time className="message-time" dateTime={message.createdAt}>
                  {timeLabel(message.createdAt)}
                  {own && message.status === "sending" && (
                    <span className="message-status-icon sending" title="Sending...">
                      <Clock size={10} />
                    </span>
                  )}
                  {own && message.status === "failed" && (
                    <button
                      type="button"
                      className="message-status-icon failed"
                      title="Failed to send. Tap to retry."
                      onClick={(e) => { e.stopPropagation(); onRetryMessage?.(message); }}
                      style={{ background: "none", border: "none", padding: 0 }}
                    >
                      <AlertCircle size={10} />
                      <span className="retry-text">Retry</span>
                    </button>
                  )}
                  {own && (!message.status || message.status === "sent") && (
                    <span className="message-status-icon sent" title="Sent">
                      <Check size={10} />
                    </span>
                  )}
                </time>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
    <AnimatePresence>{newMessages && <motion.button initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="new-messages" onClick={() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }); setNewMessages(false); }}>New messages <ArrowDown size={14} /></motion.button>}</AnimatePresence>
    <div className="composer-area">
      {sendError && <p className="inline-error" role="alert">{sendError}</p>}
      {emojiOpen && <div className="emoji-picker" role="group" aria-label="Choose an emoji">{["\u{1F44B}", "\u{1F60A}", "\u{1F49B}", "\u{1F33F}", "\u{2615}", "\u{2728}", "\u{1F64C}", "\u{1F44D}"].map(emoji => <button key={emoji} onClick={() => { setDraft(value => value + emoji); setEmojiOpen(false); textarea.current?.focus(); }} aria-label={`Insert ${emoji}`}>{emoji}</button>)}</div>}
      <form className="composer" onSubmit={submit}>
        <textarea ref={textarea} aria-label="Message" placeholder="A thought, a story, a little hello..." value={draft} rows={1} maxLength={4000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
        <button type="button" className={clsx("icon-button", emojiOpen && "active")} aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(value => !value)}><Smile size={21} /></button><span className="composer-divider" /><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim() || !connected}><ArrowUpRightIcon /></button>
      </form>
      <div className="composer-hint"><span>Enter to send <i /> Shift + Enter for a new line</span><span>{draft.length > 3500 ? `${draft.length}/4000` : <><span className={clsx("status-dot", connected && "online")} />{connection === "demo" ? "Demo conversation" : connected ? "Connected" : "Reconnecting"}</>}</span></div>
    </div>
  </section>;
}

function ArrowUpRightIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19 19 5M5 5h14v14" /></svg>; }
