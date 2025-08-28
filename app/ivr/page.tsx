// app/ivr/page.tsx
'use client';

import { useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function IVRPage() {
  useEffect(() => {
    // optional: keep-alive/uptime marker; safe no-op if rules block it
    try {
      const ref = doc(db, '_meta', 'uptime');
      setDoc(ref, { ping: serverTimestamp() }, { merge: true }).catch(() => {});
    } catch {}
  }, []);

  return (
    <main className="min-h-dvh p-6 text-white">
      <section className="max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">Join a secure chat</h1>
        <p className="text-slate-300">Enter your 6-digit session code to join.</p>

        <form action="/s" method="GET" className="flex gap-2">
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 outline-none"
            aria-label="6-digit code"
            required
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            Join
          </button>
        </form>

        <div className="text-sm text-slate-400">
          <a className="underline" href="/ivr">Call IVR</a> ·{' '}
          <a className="underline" href="/docs">More info</a>
        </div>
      </section>
    </main>
  );
}

