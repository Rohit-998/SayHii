"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Eye, EyeOff, LoaderCircle, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const isRegister = mode === "register";
  useEffect(() => { if (auth.status === "authenticated") router.replace("/"); }, [auth.status, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      if (isRegister) {
        await auth.register({ username: String(data.get("username")).trim(), email: String(data.get("email")).trim(), password: String(data.get("password")), ...(String(data.get("displayName") || "").trim() ? { displayName: String(data.get("displayName")).trim() } : {}) });
        setRegistered(true);
      } else await auth.login(String(data.get("username")).trim(), String(data.get("password")));
    } catch (error) { setError(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function handleOAuth(provider: "github" | "google") {
    try {
      setBusy(true);
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate social login.");
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-frame">
      <header className="auth-nav"><Link href="/login" aria-label="SayHii home"><Brand /></Link><Link className="quiet-link" href="/demo">Take a look around <ArrowUpRight size={16} /></Link></header>
      <section className="auth-body">
        <motion.div className="auth-story" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="eyebrow"><span className="tiny-sun" /> YOUR PEOPLE. A LITTLE CLOSER.</span>
          <h1>Less noise.<br /><span>More</span><br />connection.</h1>
          <p>A little hello can go a long way.<br />Make room for the conversations that matter.</p>
          <div className="story-note"><span className="note-line" /><span>A calmer corner of the internet.</span></div>
        </motion.div>
        <motion.div className="auth-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          {registered ? <div className="registered"><span className="success-icon"><Check size={26} /></span><h2>You're one hello away.</h2><p>Your account is ready. Sign in to find your people.</p><Link className="button primary w-full" href="/login">Go to sign in <ArrowRight size={18} /></Link></div> : <>
            <span className="eyebrow">{isRegister ? "YOUR NEXT CHAPTER STARTS HERE" : "GOOD TO HAVE YOU HERE"}</span>
            <h2>{isRegister ? "Make yourself at home." : "Welcome back."}</h2>
            <p className="muted">{isRegister ? "Create an account. Start with a hello." : "Your conversations are waiting for you."}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                className="button secondary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", height: "42px", padding: "0 10px" }}
                disabled={busy}
                onClick={() => handleOAuth("github")}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </button>
              <button
                type="button"
                className="button secondary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", height: "42px", padding: "0 10px" }}
                disabled={busy}
                onClick={() => handleOAuth("google")}
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google
              </button>
            </div>
            <div className="auth-divider" style={{ margin: "20px 0 16px" }}><span />or continue with credentials<span /></div>
            {auth.status === "error" ? <div className="inline-error" role="alert"><p>{auth.error}</p><button className="text-button" onClick={auth.retry}>Retry connection</button><button className="text-button" onClick={auth.logout}>Use another account</button></div> : <form onSubmit={submit} className="auth-form">
              <label>Username<input name="username" autoComplete="username" placeholder="Your username" required minLength={isRegister ? 3 : 1} maxLength={50} disabled={busy} /></label>
              {isRegister && <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required disabled={busy} /></label>}
              {isRegister && <label>Display name <span className="muted">(optional)</span><input name="displayName" autoComplete="nickname" placeholder="What should we call you?" maxLength={80} disabled={busy} /></label>}
              <label>Password<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "At least 8 characters" : "Your password"} required minLength={isRegister ? 8 : 1} disabled={busy} /><button type="button" className="icon-button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
              {(error || auth.error) && <p className="inline-error" role="alert">{error || auth.error}</p>}
              <button className="button primary w-full" disabled={busy || auth.status === "loading"} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <>{isRegister ? "Create account" : "Sign in"}<ArrowRight size={18} /></>}</button>
            </form>}
            <p className="auth-switch">{isRegister ? "Already part of the conversation?" : "New around here?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
            <div className="auth-divider"><span />or explore first<span /></div>
            <Link className="button secondary w-full" href="/demo"><Sparkles size={16} /> Try the interactive demo</Link>
          </>}
        </motion.div>
      </section>
      <footer className="auth-footer"><span>Real conversations. Naturally.</span><span>Made for a little more together.</span></footer>
    </div>
  </main>;
}
