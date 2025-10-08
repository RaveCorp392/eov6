'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { watchSession, sendMessage, db } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AckWatcherCaller from '@/components/ack/AckWatcherCaller';
import CallerDetailsForm from '@/components/CallerDetailsForm';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export default function CallerSessionPage({ params }: { params: { code: string } }) {
  const [code] = useState(params.code);
  const [session, setSession] = useState<any>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const privacyRequestRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/sessions/join', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (cancelled) return;
        if (r.status === 409) {
          setBlocked('This code has already been used. Ask your agent for a new code.');
          return;
        }
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          const message = typeof j?.error === 'string' && j.error ? j.error : 'Unable to join this code.';
          setBlocked(message);
        }
      } catch {
        if (!cancelled) setBlocked('Unable to join this code.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (blocked) return;
    return watchSession(code, setSession);
  }, [code, blocked]);

  const requestPrivacyAck = useCallback(
    async (body: string) => {
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
    },
    [code]
  );

  useEffect(() => {
    if (blocked) return;
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
        await requestPrivacyAck(text);
        privacyRequestRef.current = orgId;
      } catch (err) {
        console.error('[caller/privacy]', err);
      }
    })();
  }, [blocked, session?.orgId, session?.ackProgress?.privacy, session?.pendingAck?.id, code, requestPrivacyAck]);

  const consentAccepted = Boolean(session?.consent?.accepted);
  const consentBlocked = Boolean(session?.policySnapshot?.required) && !consentAccepted;

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
      {blocked ? (
        <div className="mx-auto max-w-2xl p-4">
          <div className="rounded border bg-amber-50 p-4 text-amber-800">{blocked}</div>
        </div>
      ) : (
        <>
          <AckWatcherCaller code={code} />
          <div className="mx-auto max-w-2xl p-4 space-y-3">
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

            <ChatWindow code={code} role="caller" disabled={consentBlocked} showUpload />
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
        </>
      )}
    </ConsentGate>
  );
}
