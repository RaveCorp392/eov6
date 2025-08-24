"use client";

import { ReactNode, useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";

export default function AgentAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  async function handleSignIn() {
    try {
      setBusy(true);
      await signInWithPopup(auth, googleProvider);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">EOV6 Agent</h1>
        <p className="text-sm text-slate-600 mb-4">
          Please sign in with Google to open the agent console.
        </p>
        <button
          onClick={handleSignIn}
          disabled={busy}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in with Google"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
