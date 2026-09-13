"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Eye, EyeOff, LoaderCircle, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/ui";

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
