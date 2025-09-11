// components/ConsentModal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PolicySnapshot } from '@/types/policy';

interface Props {
  code: string;
  policy?: PolicySnapshot | null;
  consentAccepted?: boolean | undefined;
  role: 'caller' | 'agent';
}

export default function ConsentModal({ code, policy, consentAccepted, role }: Props) {
  const mustShow = useMemo(() => Boolean(policy?.required) && !consentAccepted, [policy, consentAccepted]);
  const [open, setOpen] = useState(mustShow);
  useEffect(() => setOpen(mustShow), [mustShow]);

  if (!policy || !open) return null;
  const pol = policy; // narrowed

  async function accept() {
    const sRef = doc(db, 'sessions', code);
    await updateDoc(sRef, {
      consent: {
        accepted: true,
        version: pol.version,
        role,
        at: serverTimestamp(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : undefined,
      },
    });
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      role: 'system',
      type: 'system',
      text: `Consent accepted (v${pol.version}).`,
      createdAt: serverTimestamp(),
    });
    setOpen(false);
  }

  async function decline() {
    const sRef = doc(db, 'sessions', code);
    await updateDoc(sRef, {
      consent: {
        accepted: false,
        version: pol.version,
        role,
        at: serverTimestamp(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : undefined,
      },
    });
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      role: 'system',
      type: 'system',
      text: `Consent declined (v${pol.version}). Chat disabled.`,
      createdAt: serverTimestamp(),
    });
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="relative w-[min(640px,92vw)] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6"
      >
        <h2 id="consent-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {pol.title || 'Privacy & Consent'}
        </h2>
        {pol.linkUrl && (
          <a
            href={pol.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline text-blue-600 dark:text-blue-400"
          >
            View full policy
          </a>
        )}
        <div className="mt-4 whitespace-pre-wrap text-slate-700 dark:text-slate-200 text-sm leading-6 max-h-[44vh] overflow-auto">
          {pol.statementText}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Accept & Continue
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Version {pol.version} • Your consent will be recorded for this session.
        </p>
      </div>
    </div>
  );
}
