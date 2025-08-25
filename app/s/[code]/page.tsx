'use client';

import { useEffect } from 'react';
import { ensureSessionOpen } from '@/lib/ensureSession';
import ChatWindow from '@/components/ChatWindow';
import FileUploader from '@/components/FileUploader';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CallerSession({ params }: { params: { code: string }}) {
  const code = params.code;

  useEffect(() => {
    // Make sure the Firestore doc exists & TTL is fresh as soon as the page loads
    ensureSessionOpen(code, { ttlHours: 1 }).catch(console.error);
  }, [code]);

  const sendDetails = async (name: string, email: string, phone: string) => {
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      from: 'system',
      text: 'Caller shared contact details.',
      at: serverTimestamp(),
    });
    await addDoc(collection(db, 'sessions', code, 'messages'), {
      from: 'caller',
      text: `Name: ${name} — Email: ${email} — Phone: ${phone}`,
      at: serverTimestamp(),
    });
    // Also stamp these on the session doc so the agent panel shows them if you have that wired
    // (optional; omit if you’ve already done this elsewhere)
    // import { doc, setDoc } from 'firebase/firestore' at top if you want this block.
    // await setDoc(doc(db, 'sessions', code), { name, email, phone, identified: true }, { merge: true });
  };

  return (
    <div className="col" style={{gap:16}}>
      <div className="panel"><h2 style={{margin:0}}>Session {code}</h2></div>

      <div style={{display:'grid', gap:16, gridTemplateColumns:'2fr 1fr'}}>
        <ChatWindow code={code} role="caller" />

        <div className="panel">
          <h3>Send your details</h3>
          {/* Replace with your existing small form; using native inputs keeps this file focused */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            await sendDetails(
              String(fd.get('name') || ''),
              String(fd.get('email') || ''),
              String(fd.get('phone') || '')
            );
            (e.currentTarget as HTMLFormElement).reset();
          }}>
            <input className="input" name="name" placeholder="Full name" />
            <input className="input" name="email" placeholder="Email" />
            <input className="input" name="phone" placeholder="Phone" />
            <div style={{height:8}} />
            <button className="button">Send details</button>
          </form>

          <div style={{height:16}} />
          <h3>File upload (beta)</h3>
          <FileUploader code={code} />
        </div>
      </div>
    </div>
  );
}
