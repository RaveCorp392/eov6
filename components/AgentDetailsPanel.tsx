'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';

type SessionDoc = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  identified?: boolean;
};

export default function AgentDetailsPanel({ code }: { code: string }) {
  const [info, setInfo] = useState<SessionDoc>({});

  useEffect(() => {
    const ref = doc(db, 'sessions', code);
    const unsub = onSnapshot(ref, (snap) => {
      setInfo((snap.data() as SessionDoc) ?? {});
    });
    return () => unsub();
  }, [code]);

  return (
    <div className="p-3 text-sm space-y-2 border border-neutral-800 rounded">
      <h3 className="font-semibold">Caller details</h3>
      <div><span className="opacity-70">Name</span> — {info?.name || '—'}</div>
      <div><span className="opacity-70">Email</span> — {info?.email || '—'}</div>
      <div><span className="opacity-70">Phone</span> — {info?.phone || '—'}</div>
      <div><span className="opacity-70">Identified</span> — {info?.identified ? 'Yes' : 'No'}</div>
    </div>
  );
}
