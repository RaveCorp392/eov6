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

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin</h1>
      {user ? (
        <>
          <p>Signed in as {user.email ?? user.uid}</p>
          <button onClick={doLogout}>Sign out</button>
        </>
      ) : (
        <button onClick={doLogin}>Sign in with Google</button>
      )}
    </main>
  );
}
