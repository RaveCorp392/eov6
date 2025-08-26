'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type SessionDoc = {
  name?: string;
  email?: string;
  phone?: string;
  identified?: boolean;
};

export default function AgentDetailsPanel({ code }: { code: string }) {
  const [s, setS] = useState<SessionDoc>({});

  useEffect(() => {
    const ref = doc(db, 'sessions', code);
    const unsub = onSnapshot(ref, (snap) => setS(snap.data() as SessionDoc ?? {}));
    return () => unsub();
  }, [code]);

  return (
    <div className="p-3 border-l border-neutral-800 min-w-[280px]">
      <h3 className="font-semibold mb-2">Caller details</h3>
      <div className="space-y-1 text-sm">
        <div><span className="opacity-70">Name</span> — {s.name ?? '—'}</div>
        <div><span className="opacity-70">Email</span> — {s.email ?? '—'}</div>
        <div><span className="opacity-70">Phone</span> — {s.phone ?? '—'}</div>
        <div><span className="opacity-70">Identified</span> — {s.identified ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}
