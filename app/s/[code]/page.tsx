'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureSessionOpen } from '@/lib/ensureSession';
import FileUploader from '@/components/FileUploader';

export default function CallerSessionPage() {
  const params = useParams<{ code: string }>();
  const code = useMemo(() => `${params.code}`, [params.code]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // ensure the session exists when the page mounts
  useEffect(() => {
    if (!code) return;
    ensureSessionOpen(code).catch(() => {});
  }, [code]);

  async function sendDetails() {
    // write details to the SESSION DOC (this is what the agent details panel reads)
    await setDoc(
      doc(db, 'sessions', code),
      { name, email, phone, identified: true },
      { merge: true }
    );

    // also post transcript lines (nice for audit)
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      from: 'system',
      text: 'Caller shared contact details.',
      at: serverTimestamp(),
    });

    await addDoc(collection(db, 'sessions', code, 'messages'), {
      from: 'caller',
      text: `Name: ${name} — Email: ${email} — Phone: ${phone}`,
      at: serverTimestamp(),
    });
  }

  async function sendChat(text: string) {
    if (!text.trim()) return;
    await ensureSessionOpen(code);
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      from: 'caller',
      text,
      at: serverTimestamp(),
    });
  }

  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="text-xs opacity-70">🔒 Ephemeral: cleared when the session ends.</div>
        {/* A very simple text box; your existing chat UI can remain here */}
        {/* … */}
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="font-semibold mb-2">Send your details</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
            <input
              className="w-44 px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </div>
          <button
            onClick={sendDetails}
            className="mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500"
          >
            Send details
          </button>
        </section>

        <section>
          <h3 className="font-semibold mb-2">File upload (beta)</h3>
          <FileUploader code={code} />
        </section>
      </div>
    </div>
  );
}
