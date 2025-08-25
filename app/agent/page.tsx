'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NewSessionButton from '@/components/NewSessionButton';

export default function AgentLanding() {
  const r = useRouter();
  const [code, setCode] = useState('');

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().replace(/\D/g, '');
    if (c.length) r.push(`/agent/s/${c}`);
  };

  return (
    <div className="col" style={{gap:16}}>
      <div className="panel">
        <h2 style={{margin:0}}>EOV6 • Agent</h2>
        <div className="small" style={{opacity:.8}}>Create a session or join an existing one.</div>
      </div>

      <div className="panel" style={{display:'flex', gap:16, alignItems:'center'}}>
        <NewSessionButton />
        <form onSubmit={join} style={{display:'flex', gap:8, alignItems:'center'}}>
          <input
            placeholder="Enter 6‑digit code"
            value={code}
            onChange={e=>setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            className="input"
            style={{width:160}}
          />
          <button className="button" type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}
