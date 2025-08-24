// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";

export default function AdminPage() {
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
    try {
      setBusy(true);
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[70vh] max-w-xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin sign-in</h1>

      {!user ? (
        <div className="rounded-2xl border p-6 shadow-sm">
          <p className="mb-4 text-gray-700">
            Sign in with Google to access the admin/agent tools.
          </p>
          <button
            onClick={handleSignIn}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in with Google"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
            ) : null}
            <div>
              <div className="font-medium">{user.displayName ?? user.email}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/agent"
              className="px-4 py-2 rounded-xl border hover:bg-gray-50"
            >
              Go to Agent Console
            </a>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-gray-800 text-white disabled:opacity-50"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Tip: You can restrict who may sign in by enabling{" "}
            <em>“Block all users except those on allowlist”</em> in Firebase Auth &rarr;{" "}
            <em>Blocking functions</em> (or add domain restrictions under <em>Users</em>).
          </p>
        </div>
      )}
    </main>
  );
}
