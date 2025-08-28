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

  return (
    <main style={{ padding: 16, maxWidth: 760 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 12 }}>Agent console</h1>

      {!ready && <p>Loading…</p>}

      {ready && !user && (
        <div>
          <p>You’re not signed in.</p>
          <button onClick={doLogin} style={{ padding: "8px 12px" }}>
            Sign in with Google
          </button>
        </div>
      )}

      {ready && user && (
        <div>
          <p style={{ marginBottom: 8 }}>
            Signed in as <strong>{user.email}</strong>
          </p>
          <button onClick={doLogout} style={{ padding: "8px 12px" }}>
            Sign out
          </button>
        </div>
      )}
    </main>
  );
}
