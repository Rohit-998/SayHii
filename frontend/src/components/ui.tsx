"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, X, Users } from "lucide-react";
import { motion } from "framer-motion";
import { initials } from "@/lib/chat-utils";
import clsx from "clsx";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={clsx("brand", compact && "brand-compact")}><span className="brand-mark"><MessageCircle size={23} strokeWidth={2.2} /><i /><i /></span>{!compact && <>SayHii<span className="brand-dot">.</span></>}</span>;
}

export function Avatar({ name, id = 0, online, group, small = false }: { name: string; id?: number; online?: boolean; group?: boolean; small?: boolean }) {
  return <span className={clsx("avatar", `avatar-${id % 6}`, small && "avatar-small", group && "avatar-group")} aria-label={online === undefined ? name : `${name}, ${online ? "online" : "offline"}`}>
    {group ? <Users size={20} /> : initials(name)}
    {online !== undefined && <span className={clsx("presence", online && "is-online")} />}
  </span>;
}

export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="glass-dialog" aria-labelledby="dialog-title" onCancel={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="dialog-heading"><div><span className="eyebrow">A LITTLE CLOSER</span><h2 id="dialog-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>
      {subtitle && <p className="muted dialog-subtitle">{subtitle}</p>}{children}
    </motion.div>
  </dialog>;
}
