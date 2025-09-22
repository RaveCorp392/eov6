"use client";
import { useEffect, useMemo, useState } from 'react';
import { watchDetails, saveDetails, clearAck, db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type AckRequest = { requireName?: boolean } | null;

export default function AckModal({
  sessionId,
  ackRequest,
}: {
  sessionId: string;
  ackRequest: AckRequest;
}) {
  const [open, setOpen] = useState<boolean>(Boolean(ackRequest));
  const [typedName, setTypedName] = useState('');
  const [existingName, setExistingName] = useState<string | null>(null);

  // Mirror open/close from prop
  useEffect(() => setOpen(Boolean(ackRequest)), [ackRequest]);

  // Hydrate existing caller name while open
  useEffect(() => {
    if (!open) return;
    const unsub = watchDetails(sessionId, (d) => {
      setExistingName((d?.name || '').trim() || null);
    });
    return () => unsub();
  }, [open, sessionId]);

  if (!open || !ackRequest) return null;

  const mustAskName = ackRequest.requireName && !existingName;

  async function accept() {
    const nameToUse = (typedName || existingName || '').trim();
    if (mustAskName && !nameToUse) return;

    // Only SAVE name if none exists yet (do not overwrite existing)
    if (!existingName && nameToUse) {
      await saveDetails(sessionId, { name: nameToUse });
    }

    const msgs = collection(db, 'sessions', sessionId, 'messages');
    await addDoc(msgs, {
      role: 'system',
      type: 'ack',
      text: nameToUse ? `Acknowledgement accepted by ${nameToUse}.` : `Acknowledgement accepted.`,
      ack: { id: 'ack', title: 'Acknowledgement', status: 'accepted' },
      createdAt: serverTimestamp(),
    } as any);
    await clearAck(sessionId);
    setOpen(false);
  }

  async function decline() {
    const msgs = collection(db, 'sessions', sessionId, 'messages');
    await addDoc(msgs, {
      role: 'system',
      type: 'ack',
      text: 'Acknowledgement declined.',
      ack: { id: 'ack', title: 'Acknowledgement', status: 'declined' },
      createdAt: serverTimestamp(),
    } as any);
    await clearAck(sessionId);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div role="dialog" aria-modal="true" className="relative w-[min(560px,92vw)] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
        <h2 className="text-xl font-semibold">Please acknowledge</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Please read and accept to continue.
        </p>

        {mustAskName && (
          <div className="mt-4">
            <label className="text-sm block mb-1">Type your name to acknowledge</label>
            <input
              autoComplete="name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Your full name"
            />
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={decline} className="px-4 py-2 rounded-lg border">Decline</button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
