'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function AdminPage() {
  const auth = useMemo(() => getAuth(app), []);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const off = onAuthStateChanged(auth, setUser, (e) => setErr(e.message));
    return () => off();
  }, [auth]);

  const signIn = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: any) {
      setErr(e?.message ?? 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signOut(auth);
    } catch (e: any) {
      setErr(e?.message ?? 'Sign-out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">EOV6 • Admin</h1>
        {user ? (
          <button
            onClick={logout}
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Sign out
          </button>
        ) : null}
      </header>

      {err ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      ) : null}

      {!user ? (
        <section className="rounded-xl border p-5">
          <p className="mb-4 text-sm text-gray-700">
            Sign in with Google to access the agent console and internal tools.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Sign in with Google
          </button>
        </section>
      ) : (
        <section className="space-y-5 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {user.displayName || user.email || 'Signed in'}
              </div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm text-gray-700">
              You’re signed in. Open the Agent Console to run or join sessions.
            </p>
            <Link
              href="/agent"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500"
            >
              Open Agent Console
            </Link>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm text-gray-700">
              Need to invite callers? Share the standard caller entry page:
            </p>
            <code className="block truncate rounded-md bg-white px-3 py-2 text-sm shadow">
              https://eov6.com
            </code>
          </div>
        </section>
      )}
    </main>
  );
}
