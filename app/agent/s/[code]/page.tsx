'use client';

import ChatWindow from '@/components/ChatWindow';
import UploadButton from '@/components/UploadButton';
import { ensureSessionOpen, expiryInHours } from '@/lib/ensureSession';
import { db } from '@/lib/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function CallerSession({ params }: { params: { code: string }}) {
  const code = params.code;
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identified, setIdentified] = useState(false);

  // Always create/open the parent doc on mount
  useEffect(() => {
    ensureSessionOpen(code).then(() => setLoaded(true));
  }, [code]);

  const sendDetails = async () => {
    await ensureSessionOpen(code);
    await updateDoc(doc(db, 'sessions', code), {
      name: name || null,
      email: email || null,
      phone: phone || null,
      identified: true,
      createdAt: serverTimestamp(),
      expiresAt: expiryInHours(1)
    });
    setIdentified(true);
  };

  if (!loaded) return <div className="panel">Loading…</div>;

  return (
    <div className="col" style={{gap: 16}}>
      <div className="panel" style={{display:'flex', justifyContent:'space-between'}}>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <h2 style={{margin:0}}>Session <span className="mono">{code}</span></h2>
          <span className="badge">Secure shared chat</span>
        </div>
      </div>

      <ChatWindow code={code} role="caller" />

      <div style={{display:'grid', gap:16, gridTemplateColumns:'1fr 1fr'}}>
        <div className="panel">
          <div className="small">Send your details</div>
          <div style={{height:8}} />
          <div className="col" style={{gap: 8}}>
            <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="button" onClick={sendDetails}>Send details</button>
            {identified ? <div className="small">✅ Details sent</div> : null}
          </div>
        </div>
        <UploadButton code={code} />
      </div>
    </div>
  );
}
