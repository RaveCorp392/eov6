'use client';

import ChatWindow from '@/components/ChatWindow';
import AgentDetailsPanel from './AgentDetailsPanel';
import { db } from '@/lib/firebase';
import { ensureSessionOpen } from '@/lib/ensureSession';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function AgentSession({ params }: { params: { code: string }}) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    ensureSessionOpen(code);
    const unsub = onSnapshot(doc(db, 'sessions', code), s => {
      if (s.exists()) setSession({ id: s.id, ...s.data() });
    });
    return () => unsub();
  }, [code]);

  const endSession = async () => {
    await updateDoc(doc(db, 'sessions', code), { closed: true, closedAt: serverTimestamp() });
  };

  return (
    <div className="col" style={{gap:16}}>
      <div className="panel" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <h2 style={{margin:0}}>Session <span className="mono">{code}</span></h2>
          {session?.closed ? <span className="badge">Closed</span> : <span className="badge" style={{background:'#155e75'}}>Open</span>}
        </div>
        {!session?.closed && <button className="button" onClick={endSession}>End session</button>}
      </div>

      <div style={{display:'grid', gap:16, gridTemplateColumns:'2fr 1fr'}}>
        <ChatWindow code={code} role="agent" />
        <AgentDetailsPanel code={code} />
      </div>
    </div>
  );
}
