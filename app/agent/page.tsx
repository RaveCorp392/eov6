'use client';

import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { randomCode, expiryInHours } from '@/lib/code';

export default function AgentHome() {
  const router = useRouter();

  async function startSession() {
    const code = randomCode();
    // Upsert a fresh session doc the agent owns
    await setDoc(doc(collection(db, 'sessions'), code), {
      createdAt: serverTimestamp(),
      expiresAt: expiryInHours(1),
      closed: false,
    }, { merge: true });

    router.push(`/agent/s/${code}`);
  }

  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">Agent console</h1>
      <button
        onClick={startSession}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Start new session
      </button>
    </main>
  );
}
