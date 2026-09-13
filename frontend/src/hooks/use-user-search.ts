"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { demoPeople } from "@/lib/demo";
import type { User } from "@/types/chat";

export function useUserSearch(query: string) {
  const { token, isDemo, user } = useAuth();
  const [results, setResults] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const term = query.trim();
    setResults([]); setError("");
    if (!term || (!token && !isDemo)) { setBusy(false); return; }
    setBusy(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = isDemo ? demoPeople.filter(person => person.username.toLowerCase().includes(term.toLowerCase())) : await api.searchUsers(token!, term, controller.signal);
        if (!controller.signal.aborted) setResults(data.filter(person => person.id !== user?.id));
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Search is unavailable. Try again."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, token, isDemo, user?.id]);
  return { results, busy, error };
}
