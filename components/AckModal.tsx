// components/AckModal.tsx
'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AckModal(props: {
  code: string;
  title: string;
  body: string;
  requireName?: boolean;
  onClose?: () => void;
}) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(true);

  async function accept() {
    await addDoc(collection(db, 'sessions', props.code, 'messages'), {
      role: 'system',
      type: 'system',
      text: `Acknowledgement accepted: ${props.title}${props.requireName && name ? ` — Signed: ${name}` : ''}`,
      createdAt: serverTimestamp(),
    });
    setOpen(false);
    props.onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative w-[min(640px,92vw)] rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">{props.title}</h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-6">{props.body}</div>
        {props.requireName && (
          <input
            className="mt-4 w-full border rounded px-3 py-2"
            placeholder="Type your full name to sign"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={() => { setOpen(false); props.onClose?.(); }}
            className="px-4 py-2 rounded-lg border"
          >
            Cancel
          </button>
          <button
            disabled={props.requireName && !name.trim()}
            onClick={accept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
