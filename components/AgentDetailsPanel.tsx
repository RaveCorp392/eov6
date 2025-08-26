'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';

type Props = { code: string };

export default function AgentDetailsPanel({ code }: Props) {
  const [info, setInfo] = useState<{name?: string|null; email?: string|null; phone?: string|null; identified?: boolean}>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sessions', code), (snap)=>{
      setInfo((snap.data() as any) ?? {});
    });
    return unsub;
  }, [code]);

  return (
    <section className="text-sm space-y-2">
      <h2 className="font-semibold">Caller details</h2>
      <div>Name — {info?.name ?? '—'}</div>
      <div>Email — {info?.email ?? '—'}</div>
      <div>Phone — {info?.phone ?? '—'}</div>
      <div>Identified — {info?.identified ? 'Yes' : 'No'}</div>
    </section>
  );
}
