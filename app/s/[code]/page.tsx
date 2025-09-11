// app/s/[code]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, addDoc, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';

type Msg = { id: string; role: 'caller'|'agent'|'system'; text?: string; createdAt?: any; type?: string };

export default function CallerSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, 'sessions', code), (snap) => setSession({ id: code, ...snap.data() }));
    const q = query(collection(db, 'sessions', code, 'messages'), orderBy('createdAt', 'asc'));
    const unsub2 = onSnapshot(q, (ss) => setMessages(ss.docs.map(d => ({ id: d.id, ...(d.data() as any) }))));
    return () => { unsub1(); unsub2(); };
  }, [code]);

  const consentAccepted = Boolean(session?.consent?.accepted);
  const blocked = Boolean(session?.policySnapshot?.required) && !consentAccepted;

  async function send(text: string) {
    if (!text.trim() || blocked) return;
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      role: 'caller',
      type: 'text',
      text,
      createdAt: new Date(),
    });
  }

  return (
    <ConsentGate
      code={code}
      policy={session?.policySnapshot}
      consentAccepted={consentAccepted}
      role="caller"
    >
      <div className="mx-auto max-w-2xl p-4 space-y-3">
        <header className="mb-2 flex items-center justify-between">
          <div className="text-slate-600 dark:text-slate-300">EOV6 • Session {code}</div>
          <div className="text-xs text-slate-500">Ephemeral — clears on finish</div>
        </header>

        <div className="h-[60vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white/60 dark:bg-slate-900/60">
          {messages.map(m => (
            <div key={m.id} className="mb-2">
              <span className="text-xs text-slate-500 mr-2">{m.role}</span>
              <span className="text-slate-900 dark:text-slate-100">{m.text}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            disabled={blocked}
            id="msg"
            className="flex-1 rounded-lg border px-3 py-2 disabled:opacity-50"
            placeholder={blocked ? 'Please accept the privacy notice to continue…' : 'Type a message'}
            onKeyDown={async (e) => {
              const el = e.currentTarget as HTMLInputElement;
              if (e.key === 'Enter') {
                await send(el.value);
                el.value = '';
              }
            }}
          />
          <button
            disabled={blocked}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
            onClick={async () => {
              const el = document.getElementById('msg') as HTMLInputElement | null;
              if (!el) return;
              await send(el.value);
              el.value = '';
            }}
          >
            Send
          </button>
        </div>
      </div>
    </ConsentGate>
  );
}
