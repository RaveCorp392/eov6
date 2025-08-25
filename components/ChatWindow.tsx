'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Timestamp } from 'firebase/firestore';

type Msg = {
  id?: string;
  text?: string;
  from: 'agent' | 'caller' | 'system';
  at?: Timestamp | null;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

export default function ChatWindow({ code, role }: { code: string; role: 'agent'|'caller'; }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement | null>(null);

  // Live stream of messages
  useEffect(() => {
    const q = query(collection(db, 'sessions', code, 'messages'), orderBy('at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr: Msg[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setMsgs(arr);
    });
    return () => unsub();
  }, [code]);

  // Robust auto‑scroll even when server timestamps reorder items
  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const tx = text.trim();
    if (!tx) return;
    setText('');
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      text: tx,
      from: role,
      at: serverTimestamp()
    });
  };

  return (
    <div className="panel" style={{display: 'flex', flexDirection: 'column', height: 420}}>
      <div className="small" style={{opacity:.75, marginBottom: 8}}>🔒 Ephemeral: cleared when the session ends.</div>
      <div style={{flex: 1, overflow: 'auto', paddingRight: 4}}>
        {msgs.map((m) => (
          <div key={m.id} style={{margin: '8px 0'}}>
            <div className="small" style={{color: '#a3e5ff'}}>{m.from.toUpperCase()}</div>
            {m.fileUrl ? (
              <div>
                <a href={m.fileUrl} target="_blank" rel="noreferrer">{m.fileName || 'file'}</a>
                {typeof m.fileSize === 'number' ? <span className="small"> ({Math.round(m.fileSize/1024)} KB)</span> : null}
              </div>
            ) : (
              <div>{m.text}</div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} style={{display:'flex', gap:8, marginTop:8}}>
        <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="button" type="submit">Send</button>
      </form>
    </div>
  );
}
