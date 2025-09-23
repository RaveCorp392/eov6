// app/s/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { watchSession } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AckWatcherCaller from '@/components/ack/AckWatcherCaller';
import CallerDetailsForm from '@/components/CallerDetailsForm';
import TranslateBanner from '@/components/TranslateBanner';
import { sendMessage } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import PrivacyCard from '@/components/PrivacyCard';
import { doc, onSnapshot } from 'firebase/firestore';

export default function CallerSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);
  const [privacyText, setPrivacyText] = useState<string>("");

  useEffect(() => watchSession(code, setSession), [code]);

  // Watch org privacy statement; fallback to ackTemplate if empty.
  useEffect(() => {
    const key = `privacy:dismiss:${code}`;
    const dismissed = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (dismissed === '1') return;
    const orgId = session?.orgId;
    if (!orgId) return;
    const off = onSnapshot(doc(db, 'orgs', String(orgId)), (snap) => {
      const d = (snap.data() as any) || {};
      const text = String((d?.texts?.privacyStatement || d?.texts?.ackTemplate || '').trim());
      setPrivacyText(text);
    });
    return () => off();
  }, [code, session?.orgId]);

  const consentAccepted = Boolean(session?.consent?.accepted);
  const blocked = Boolean(session?.policySnapshot?.required) && !consentAccepted;

  async function endSession() {
    if (!confirm('End session and delete chat data?')) return;
    try {
      await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      window.location.href = '/';
    } catch (e) {
      alert('Could not end session. Please try again.');
    }
  }

  return (
    <ConsentGate
      code={code}
      policy={session?.policySnapshot}
      consentAccepted={consentAccepted}
      role="caller"
    >
      <AckWatcherCaller code={code} />
      <div className="mx-auto max-w-2xl p-4 space-y-3">
        <header className="mb-2 flex items-center justify-between">
          <div className="text-slate-600 dark:text-slate-300">EOV6 — Session {code}</div>
          <div className="text-xs text-slate-500">Ephemeral — clears on finish</div>
        </header>

        {session && <TranslateBanner session={session} />}
        {privacyText?.trim() && (
          <PrivacyCard
            text={privacyText}
            onDismiss={() => {
              try { localStorage.setItem(`privacy:dismiss:${code}`, '1'); } catch {}
            }}
          />
        )}
        <CallerDetailsForm code={code} />
        <button
          className="text-xs underline opacity-70 hover:opacity-100"
          onClick={async () => {
            try {
              await fetch('/api/session/translate-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, requested: true }) });
              await sendMessage(code, { sender: 'caller', type: 'system', text: 'Caller requested live translation.' });
            } catch {}
          }}
        >
          Request translation
        </button>

        <ChatWindow code={code} role="caller" disabled={blocked} showUpload />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={endSession}
            className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-sm"
          >
            End session &amp; delete data
          </button>
        </div>
      </div>
    </ConsentGate>
  );
}

