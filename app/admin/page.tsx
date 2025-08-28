// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const doLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const doLogout = async () => {
    await signOut(auth);
  };

  if (!ready) {
    return (
      <main className="p-6 text-white/80">
        <p>Checking auth…</p>
      </main>
    );
  }

  return (
    <main className="p-6 text-white">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agent console</h1>
        {user ? (
          <button
            onClick={doLogout}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={doLogin}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            Sign in with Google
          </button>
        )}
      </header>

      {user ? (
        <div className="space-y-1 text-sm text-white/80">
          <div>Signed in as: {user.displayName || user.email}</div>
          <div className="text-white/60">{user.uid}</div>
        </div>
      ) : (
        <p className="text-white/70 text-sm">Please sign in to continue.</p>
      )}
    </main>
  );
}
