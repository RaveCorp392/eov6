"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { app } from "@/lib/firebase";

const ALLOWED_DOMAIN =
  (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "").toLowerCase().trim(); // e.g. "acme.com"

export default function AgentAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useMemo(() => getAuth(app), []);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, [auth]);

  async function login() {
    setDenied(null);
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const email = res.user?.email || "";
    if (ALLOWED_DOMAIN && !email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      // Sign out immediately if not allowed
      await signOut(auth);
      setDenied(
        `This environment only allows @${ALLOWED_DOMAIN} accounts for agent access.`
      );
    }
  }

  async function logout() {
    await signOut(auth);
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-600">
        Checking agent access…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 px-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Agent sign-in
        </h1>
        <p className="mt-2 text-slate-600">
          Sign in with Google to open and manage sessions.
        </p>
        {ALLOWED_DOMAIN && (
          <p className="mt-1 text-xs text-slate-500">
            Allowed domain: <b>@{ALLOWED_DOMAIN}</b>
          </p>
        )}
        {denied && (
          <p className="mt-3 text-sm text-red-600">
            {denied}
          </p>
        )}
        <button
          onClick={login}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  // Signed in & allowed
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <div className="text-sm text-slate-600">
            Signed in as <b>{user.email}</b>
          </div>
          <div className="flex items-center gap-3">
            <a href="/marketing" className="text-sm text-slate-600 underline">
              Marketing
            </a>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
