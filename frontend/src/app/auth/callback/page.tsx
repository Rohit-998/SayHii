"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function processOAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          throw new Error("No authenticated user found from provider.");
        }

        const user = session.user;
        const metadata = user.user_metadata || {};
        const email = user.email || metadata.email;

        if (!email) {
          throw new Error("Unable to retrieve email from your OAuth provider.");
        }

        const username =
          metadata.user_name ||
          metadata.preferred_username ||
          email.split("@")[0];

        const displayName =
          metadata.full_name ||
          metadata.name ||
          username;

        const profilePicture =
          metadata.avatar_url ||
          metadata.picture ||
          null;

        const provider = user.app_metadata?.provider || "oauth";

        // Sync with Spring Boot backend to issue SayHii JWT
        const { token } = await api.oauthLogin({
          email,
          username,
          displayName,
          profilePicture,
          provider,
        });

        if (!active) return;

        // Store SayHii token in localStorage and navigate home
        try {
          window.localStorage.setItem("sayhii.token", token);
        } catch {}
        window.location.href = "/";
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    }

    processOAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="auth-page" style={{ justifyContent: "center" }}>
      <div className="auth-card" style={{ textAlign: "center", justifySelf: "center", maxWidth: 420 }}>
        {error ? (
          <div>
            <h2 style={{ fontSize: 22, color: "#f87171", marginBottom: 12 }}>Sign-in issue</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{error}</p>
            <Link className="button primary w-full" href="/login">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
            <LoaderCircle className="spin" size={36} style={{ color: "var(--amber, #f3b970)" }} />
            <h2 style={{ fontSize: 20 }}>Connecting your account...</h2>
            <p className="muted">Finalizing your secure SayHii session.</p>
          </div>
        )}
      </div>
    </main>
  );
}
