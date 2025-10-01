'use client';

import { useEffect, useRef, useState } from 'react';
import { watchSession } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AckWatcherCaller from '@/components/ack/AckWatcherCaller';
import CallerDetailsForm from '@/components/CallerDetailsForm';
import { sendMessage } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useSessionJoin } from "@/hooks/useSessionJoin";

export default function CallerSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);
  const err = useSessionJoin(code);
  const privacyRequestRef = useRef<string | null>(null);

  useEffect(() => watchSession(code, setSession), [code]);

  async function openPrivacyModal(body: string) {
    if (!body) return;
    await updateDoc(doc(db, 'sessions', code), {
      pendingAck: {
        id: 'privacy',
        title: 'Privacy acknowledgement',
        body,
        requestedAt: serverTimestamp(),
        requestedBy: 'system',
      },
    });
  }

  // Automatically surface the privacy acknowledgement when an org is linked to the session.
  useEffect(() => {
    (async () => {
      const orgId = session?.orgId ? String(session.orgId) : null;
      if (!orgId) return;

      if (session?.ackProgress?.privacy === true) {
        privacyRequestRef.current = orgId;
        return;
      }

      if (session?.pendingAck?.id) {
        privacyRequestRef.current = orgId;
        return;
      }

      if (privacyRequestRef.current === orgId) return;

      const snap = await getDoc(doc(db, 'orgs', orgId));
      const text = snap.exists()
        ? String(((snap.data() as any)?.texts?.privacyStatement || '')).trim()
        : '';
      if (!text) {
        privacyRequestRef.current = orgId;
        return;
      }

      try {
        await openPrivacyModal(text);
        privacyRequestRef.current = orgId;
      } catch (err) {
        console.error('[caller/privacy]', err);
      }
    })();
  }, [session?.orgId, session?.ackProgress?.privacy, session?.pendingAck?.id, code]);

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
        {err === "already_joined" && (
          <div className="mb-3 rounded bg-amber-100 p-3 text-amber-900">
            This code has already been used -- ask your agent for a new one.
          </div>
        )}
        {err === "expired" && (
          <div className="mb-3 rounded bg-rose-100 p-3 text-rose-900">
            This code is expired -- ask your agent for a new one.
          </div>
        )}
        {err === "closed" && (
          <div className="mb-3 rounded bg-rose-100 p-3 text-rose-900">
            This session is closed.
          </div>
        )}

        <CallerDetailsForm code={code} />
        <button
          className="text-xs underline opacity-70 hover:opacity-100"
          onClick={async () => {
            try {
              await fetch('/api/session/translate-request', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ code, requested: true }),
              });
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
