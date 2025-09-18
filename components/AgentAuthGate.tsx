"use client";

import { ReactNode, useEffect, useState } from "react";

// ✅ Pull instances and helpers from our central wrapper
import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "@/lib/firebase";

// (Types only)
import type { User } from "firebase/auth";

type Props = { children: ReactNode };

export default function AgentAuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setBusy(false);
    });
    return () => unsub();
  }, []);

  async function handleSignIn() {
    setErr(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      // Common cause: preview domain not whitelisted in Firebase Auth
      setErr(e?.message ?? "Sign-in failed");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (busy) return null;

  if (!user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b1220",
          color: "#e6eefb",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            border: "1px solid #1d2942",
            borderRadius: 12,
            padding: 24,
            background: "#0f182b",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, marginBottom: 8 }}>EOV6 • Admin</h1>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Sign in with Google to open the Agent Console.
          </p>

          {err && (
            <div
              style={{
                background: "#2a1a1a",
                border: "1px solid #6b2a2a",
                color: "#ffb4b4",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {err}
            </div>
          )}

          <button
            onClick={handleSignIn}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #2b3b60",
              background: "#192643",
              color: "#e6eefb",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 5.1 29.1 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21c10.5 0 19.5-7.6 21-18v-6.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.3 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 5.1 29.1 3 24 3 16 3 9 7.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.6 2.1-7.1 2.1-5.1 0-9.4-3.4-10.9-8l-6.6 5.1C9 40.6 16 45 24 45z"/>
              <path fill="#1976D2" d="M45 24c0-1.1-.1-2.2-.4-3.3H24v8h11.3c-.7 3.4-2.8 6.2-5.9 8.1l6.1 5C40.6 38.8 45 31.9 45 24z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  // Signed in → render protected children (plus optional sign-out affordance)
  return (
    <>
      {children}
      <div style={{ position: "fixed", right: 16, bottom: 16 }}>
        <button
          onClick={handleSignOut}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #2b3b60",
            background: "#101a31",
            color: "#a9b8dd",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
