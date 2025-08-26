'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, orderBy, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AgentDetailsPanel from '@/components/AgentDetailsPanel';

type Msg = {
  text?: string;
  from: 'agent'|'caller'|'system';
  at: any; // Timestamp
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

export default function AgentSessionPage() {
  const { code } = useParams<{code: string}>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const msgsCol = useMemo(
    () => collection(db, 'sessions', code, 'messages'),
    [code]
  );

  useEffect(() => {
    const q = query(msgsCol, orderBy('at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map(d => d.data() as Msg));
      // auto-scroll
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [msgsCol]);

  async function send() {
    if (!text.trim()) return;
    await addDoc(msgsCol, { text, from: 'agent', at: serverTimestamp() });
    setText('');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] h-screen">
      <div className="flex flex-col">
        <header className="p-3 text-sm opacity-75">Session <b>{code}</b></header>
        <div ref={scroller} className="flex-1 overflow-auto px-4 space-y-2">
          {msgs.map((m, i) => (
            <div key={i} className="text-sm">
              <div className="opacity-60 uppercase">{m.from}</div>
              {m.text && <div>{m.text}</div>}
              {m.fileUrl && (
                <a href={m.fileUrl} target="_blank" className="underline">
                  {m.fileName} ({Math.round((m.fileSize ?? 0)/1024)} KB)
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 flex gap-2">
          <input
            value={text}
            onChange={(e)=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && send()}
            className="flex-1 rounded px-3 py-2 bg-neutral-900 border border-neutral-700"
            placeholder="Type a message…"
          />
          <button onClick={send} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Send</button>
        </div>
      </div>

      <aside className="border-l border-neutral-800 p-4">
        <AgentDetailsPanel code={code} />
      </aside>
    </div>
  );
}
