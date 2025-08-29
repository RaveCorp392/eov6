"use client";

import { ReactNode, useEffect, useState } from "react";
import { auth, googleProvider } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";

export default function AgentAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setBusy(false);
    });
    return () => unsub();
  }, []);

  async function signIn() {
    await signInWithPopup(auth, googleProvider);
  }
  async function signOutUser() {
    await signOut(auth);
  }

  if (busy) return null;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold mb-3">EOV6 — Admin</h2>
        <p className="mb-4 text-slate-600">
          Sign in with Google to open the Agent Console.
        </p>
        <button onClick={signIn} className="rounded bg-indigo-600 text-white px-4 py-2">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end p-2">
        <button onClick={signOutUser} className="text-sm underline">
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}
