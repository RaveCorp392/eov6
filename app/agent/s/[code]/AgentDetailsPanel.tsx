'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AgentDetailsPanel({ code }: { code: string }) {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sessions', code), snap => setS({ id: snap.id, ...snap.data() }));
    return () => unsub();
  }, [code]);

  const Placeholder = () => (
    <div className="panel" style={{opacity:.95}}>
      <div className="small" style={{opacity:.8, marginBottom:6}}>Caller details</div>
      <div style={{display:'grid', gridTemplateColumns:'80px 1fr', rowGap:6}}>
        <div className="small">Name</div><div>—</div>
        <div className="small">Email</div><div>—</div>
        <div className="small">Phone</div><div>—</div>
        <div className="small">Identified</div><div>No</div>
      </div>
      <div className="small" style={{marginTop:8, opacity:.7}}>Waiting for caller details…</div>
    </div>
  );

  if (!s) return <Placeholder />;

  return (
    <div className="panel">
      <div className="small" style={{opacity:.8, marginBottom:6}}>Caller details</div>
      <div style={{display:'grid', gridTemplateColumns:'80px 1fr', rowGap:6}}>
        <div className="small">Name</div><div>{s.name || '—'}</div>
        <div className="small">Email</div><div>{s.email || '—'}</div>
        <div className="small">Phone</div><div>{s.phone || '—'}</div>
        <div className="small">Identified</div><div>{s.identified ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}
