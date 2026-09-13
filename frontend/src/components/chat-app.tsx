"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Asterisk, Leaf, LoaderCircle, LogOut, Mail, MessageCircle, Plus, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useAuth } from "@/components/auth-provider";
import { useChatData } from "@/hooks/use-chat-data";
import { Avatar, Brand, Modal } from "@/components/ui";
import { ChatSidebar } from "@/components/chat-sidebar";
import { MessageWindow } from "@/components/message-window";
import { NewConversation } from "@/components/new-conversation";
import { displayName, roomName } from "@/lib/chat-utils";
import type { User } from "@/types/chat";

export function ChatApp() {
  const auth = useAuth();
  const router = useRouter();
  const data = useChatData();
  const [mobileChat, setMobileChat] = useState(false);
  const [dialog, setDialog] = useState<"new" | "profile" | "details" | null>(null);
  const [initialUser, setInitialUser] = useState<User>();
  useEffect(() => { if (auth.status === "unauthenticated") router.replace("/login"); }, [auth.status, router]);

  if (auth.status === "error") return <main className="status-screen"><Brand /><h1>Let's reconnect.</h1><p role="alert">{auth.error}</p><button className="button primary" onClick={auth.retry}>Try again</button><button className="text-button" onClick={auth.logout}>Back to sign in</button></main>;
  if (auth.status !== "authenticated" || !auth.user) return <main className="status-screen"><Brand /><LoaderCircle className="spin" size={25} /><p>Finding your little corner...</p></main>;
  const user = auth.user;
  const openNew = (person?: User) => { setInitialUser(person); setDialog("new"); };

  return <main className="app-page">
    <header className="app-header"><Brand /><span className="header-mantra">Less noise. <span>More connection.</span></span><div className="workspace-status"><span className={clsx("status-dot", (auth.isDemo || data.connection === "connected") && "online")} />{auth.isDemo ? "Interactive demo" : "Your personal space"}{auth.isDemo && <Link href="/login" className="quiet-link">Sign in <ArrowUpRight size={15} /></Link>}</div></header>
    <motion.div className={clsx("workspace", mobileChat && "show-mobile-chat")} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
      <ChatSidebar rooms={data.rooms} roomId={data.roomId} user={user} busy={data.roomsBusy} error={data.roomsError} retry={data.retryRooms} onSelect={id => { data.selectRoom(id); setMobileChat(true); }} onNew={() => openNew()} onProfile={() => setDialog("profile")} onPerson={person => openNew(person)} />
      {data.room ? <MessageWindow key={data.room.id} room={data.room} user={user} messages={data.messages} busy={data.historyBusy} error={data.historyError} hasMore={data.hasMore} loadOlder={data.loadOlder} retry={data.retryHistory} onSend={data.send} onRetryMessage={data.retryMessage} connection={data.connection} visibleOnMobile={mobileChat} onBack={() => setMobileChat(false)} onDetails={() => setDialog("details")} /> : <section className="chat-empty"><span className="empty-emblem"><MessageCircle size={39} strokeWidth={1.2} /></span><span className="eyebrow">YOUR PEOPLE. A LITTLE CLOSER.</span><h2>A space to<br /><span>just be you.</span></h2><p>Pick a conversation, or start something new.<br />Good things begin with a little hello.</p><button className="button primary" onClick={() => openNew()}><Plus size={18} /> Start a conversation</button></section>}
    </motion.div>
    <footer className="app-footer"><span><Leaf size={13} /> Real conversations. Naturally.</span><span>{auth.isDemo ? "Sample people & messages. Nothing is sent to a server." : "A little hello can go a long way."}<Asterisk className="footer-spark" size={20} strokeWidth={1} /></span></footer>
    {dialog === "new" && <NewConversation rooms={data.rooms} initialUser={initialUser} onClose={() => setDialog(null)} onCreated={room => { data.addRoom(room); setMobileChat(true); }} />}
    {dialog === "profile" && <Modal title="Your little corner." onClose={() => setDialog(null)}><div className="profile-card"><Avatar name={displayName(user)} id={user.id} online={user.online} /><h3>{displayName(user)}</h3><span className="profile-status"><span className={clsx("status-dot", user.online && "online")} />{user.online ? "Online" : "Offline"}</span></div><dl className="profile-fields"><div><dt><UserRound size={16} /> Username</dt><dd>@{user.username}</dd></div><div><dt><Mail size={16} /> Email</dt><dd>{user.email}</dd></div></dl>{auth.isDemo ? <><p className="demo-note">You're exploring with a sample profile.</p><Link className="button primary w-full" href="/login">Sign in to your account <ArrowUpRight size={17} /></Link></> : <button className="button secondary w-full" onClick={auth.logout}><LogOut size={17} /> Sign out</button>}</Modal>}
    {dialog === "details" && data.room && <Modal title={roomName(data.room, user.id)} subtitle={data.room.privateChat ? "A conversation just for you two." : `${data.room.members.length} people in this little circle.`} onClose={() => setDialog(null)}><div className="detail-label"><span className="eyebrow">THE PEOPLE HERE</span></div><div className="detail-members" data-native-scroll>{data.room.members.map(member => <div className="person-result" key={member.id}><Avatar name={displayName(member)} id={member.id} online={member.online} /><span><strong>{displayName(member)}{member.id === user.id ? " (you)" : ""}</strong><small>{member.online ? "Online" : "Offline"} · @{member.username}</small></span></div>)}</div><p className="demo-note">{auth.isDemo ? "Sample presence for this demo." : "Presence refreshes every 30 seconds while this tab is visible."}</p></Modal>}
  </main>;
}
