'use client';

import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { randomCode, expiryInHours } from '@/lib/code';
import AgentLandingInfo from '@/components/AgentLandingInfo';

export default function AgentHome() {
  const router = useRouter();

  async function startSession() {
    const code = randomCode();
    await setDoc(
      doc(collection(db, 'sessions'), code),
      {
        createdAt: serverTimestamp(),
        expiresAt: expiryInHours(1),
        closed: false,
      },
      { merge: true }
    );
    router.push(`/agent/s/${code}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Brand header bar */}
      <div className="bg-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            EOV6 • Agent Console
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Start a new session and share the 6-digit code with the caller.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={startSession}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
          >
            Start a new session
          </button>
          <span className="text-xs text-slate-500">
            Sessions auto-expire; end them to clear chat and uploads.
          </span>
        </div>

        {/* Info / instructions panel (your existing component) */}
        <AgentLandingInfo />
      </div>
    </main>
  );
}
