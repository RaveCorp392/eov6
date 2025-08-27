'use client';

import React, { useEffect, useRef } from 'react';
import { onSnapshot, query, collection, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Msg = {
  id: string;
  role: 'agent' | 'caller' | 'system';
  type?: 'text' | 'file';
  text?: string;
  url?: string;
  name?: string;
  contentType?: string | null;
  createdAt?: any;
};

type Props = {
  code: string;
  role: 'agent' | 'caller';
};

export default function ChatWindow({ code, role }: Props) {
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'sessions', code, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const rows: Msg[] = [];
      snap.forEach(doc => rows.push({ id: doc.id, ...(doc.data() as any) }));
      setMsgs(rows);
      // autoscroll
      requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }));
    });
    return () => unsub();
  }, [code]);

  return (
    <div ref={scrollerRef} className="h-[50vh] lg:h-[60vh] overflow-y-auto space-y-3 pr-1">
      {msgs.map(m => (
        <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm
            ${m.role === 'agent' ? 'bg-emerald-500/10 border border-emerald-500/20 self-start' : ''}
            ${m.role === 'caller' ? 'bg-sky-500/10 border border-sky-500/20 self-start' : ''}
            ${m.role === 'system' ? 'bg-white/5 border border-white/10 text-white/70 italic' : ''}`}>
          {/* FILE MESSAGE */}
          {m.type === 'file' && m.url ? (
            <div className="flex items-center gap-2">
              {/* small preview if image */}
              {m.contentType?.startsWith('image/') ? (
                <a href={m.url} target="_blank" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.name || 'image'} className="max-h-32 rounded-md" />
                </a>
              ) : null}
              <div className="flex flex-col">
                <span className="text-xs opacity-70">{m.role.toUpperCase()} • file</span>
                <a href={m.url} target="_blank" className="underline break-all">
                  {m.name || 'Download file'}
                </a>
                {m.contentType && <span className="text-xs opacity-60">{m.contentType}</span>}
              </div>
            </div>
          ) : (
            // TEXT MESSAGE (fallback)
            <div>
              <span className="text-xs opacity-70">{m.role.toUpperCase()}</span>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
