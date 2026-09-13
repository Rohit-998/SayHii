"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import type { RegisterInput, User } from "../types/chat";

type AuthState = {
  user: User | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
};

type AuthContextValue = AuthState & {
  isDemo: boolean;
  login(username: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): void;
  retry(): void;
};

const TOKEN_KEY = "sayhii.token";
const DEMO_USER: User = {
  id: 0,
  username: "demo",
  email: "demo@example.com",
  displayName: "Demo User",
  online: true,
};
const AuthContext = createContext<AuthContextValue | null>(null);
const signedOut: AuthState = { user: null, token: null, status: "unauthenticated", error: null };

export function AuthProvider({ children, demo = false, demoUser = DEMO_USER }: {
  children: ReactNode;
  demo?: boolean;
  demoUser?: User;
}) {
  const [state, setState] = useState<AuthState>({ ...signedOut, status: "loading" });
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const currentToken = useRef<string | null>(null);

  const invalidate = useCallback(() => {
    generation.current += 1;
    pending.current?.abort();
    pending.current = null;
    return generation.current;
  }, []);

  const endSession = useCallback((error: string | null = null, removeStored = true) => {
    invalidate();
    currentToken.current = null;
    if (!demo && removeStored) {
      try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* Sign out even if storage is blocked. */ }
    }
    setState({ ...signedOut, error });
  }, [demo, invalidate]);

  const validate = useCallback(async (token: string) => {
    const attempt = invalidate();
    const controller = new AbortController();
    pending.current = controller;
    currentToken.current = token;
    setState({ user: null, token, status: "loading", error: null });
    try {
      const user = await api.me(token, controller.signal);
      if (generation.current !== attempt || controller.signal.aborted) {
        throw new DOMException("Sign-in was canceled.", "AbortError");
      }
      setState({ user, token, status: "authenticated", error: null });
    } catch (error) {
      if (generation.current === attempt && !controller.signal.aborted) {
        const message = error instanceof ApiError ? error.message : "Unable to load your profile. Please try again.";
        if (error instanceof ApiError && error.status === 401) endSession(message);
        else setState({ user: null, token, status: "error", error: message });
      }
      throw error;
    } finally {
      if (generation.current === attempt) pending.current = null;
    }
  }, [endSession, invalidate]);

  const retry = useCallback(() => {
    if (demo) return;
    let token: string | null;
    try {
      token = window.localStorage.getItem(TOKEN_KEY);
    } catch {
      invalidate();
      currentToken.current = null;
      setState({ ...signedOut, status: "error", error: "Browser storage is unavailable. Enable it and try again." });
      return;
    }
    if (token) void validate(token).catch(() => {});
    else endSession(null, false);
  }, [demo, endSession, invalidate, validate]);

  useEffect(() => {
    if (demo) {
      endSession(null, false);
      return () => { invalidate(); };
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY && event.key !== null) return;
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      retry();
    };
    const onUnauthorized = (event: Event) => {
      const rejectedToken = (event as CustomEvent<{ token?: string }>).detail?.token;
      if (!currentToken.current || (rejectedToken && rejectedToken !== currentToken.current)) return;
      try {
        if (window.localStorage.getItem(TOKEN_KEY) !== currentToken.current) {
          retry();
          return;
        }
      } catch { /* In-memory sign-out still works without storage access. */ }
      endSession("Your session has expired. Please sign in again.");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sayhii:unauthorized", onUnauthorized);
    retry();
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sayhii:unauthorized", onUnauthorized);
      invalidate();
    };
  }, [demo, endSession, invalidate, retry]);

  const login = useCallback(async (username: string, password: string) => {
    if (demo) throw new Error("Authentication is unavailable in demo mode.");
    const attempt = invalidate();
    currentToken.current = null;
    setState({ ...signedOut, status: "loading" });
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      const { token } = await api.login({ username, password });
      if (generation.current !== attempt) throw new DOMException("Sign-in was canceled.", "AbortError");
      window.localStorage.setItem(TOKEN_KEY, token);
      await validate(token);
    } catch (error) {
      if (generation.current === attempt) {
        setState({ ...signedOut, error: error instanceof ApiError ? error.message : "Unable to sign in. Check browser storage and try again." });
      }
      if (error instanceof ApiError || (error instanceof Error && error.name === "AbortError")) throw error;
      throw new Error("Unable to sign in. Check browser storage and try again.");
    }
  }, [demo, invalidate, validate]);

  const register = useCallback(async (input: RegisterInput) => {
    if (demo) throw new Error("Authentication is unavailable in demo mode.");
    await api.register(input);
  }, [demo]);

  const logout = useCallback(() => {
    if (!demo) endSession();
  }, [demo, endSession]);

  const value: AuthContextValue = {
    ...(demo ? { user: demoUser, token: null, status: "authenticated" as const, error: null } : state),
    isDemo: demo,
    login,
    register,
    logout,
    retry,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
