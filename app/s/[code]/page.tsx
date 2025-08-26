'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, setDoc, serverTimestamp, addDoc, orderBy, onSnapshot, query } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { expiryInHours, slugName } from '@/lib/code';

type Msg = {
  text?: string;
  from: 'agent'|'caller'|'system';
  at: any;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

export default function CallerPage() {
  const { code } = useParams<{code: string}>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [pct, setPct] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const sessRef = useMemo(()=> doc(db, 'sessions', code), [code]);
  const msgsCol = useMemo(()=> collection(db, 'sessions', code, 'messages'), [code]);

  // ensure session doc exists + TTL gets refreshed on load
  useEffect(() => {
    setDoc(sessRef, {
      createdAt: serverTimestamp(),
      expiresAt: expiryInHours(1),
      closed: false,
    }, { merge: true });
  }, [sessRef]);

  useEffect(() => {
    const q = query(msgsCol, orderBy('at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map(d => d.data() as Msg));
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [msgsCol]);

  async function send() {
    if (!text.trim()) return;
    await addDoc(msgsCol, { text, from: 'caller', at: serverTimestamp() });
    setText('');
  }

  async function sendDetails() {
    await setDoc(sessRef, {
      name: name || null,
      email: email || null,
      phone: phone || null,
      identified: !!(name || email || phone),
      expiresAt: expiryInHours(1),
    }, { merge: true });

    await addDoc(msgsCol, {
      from: 'system',
      at: serverTimestamp(),
      text: 'Caller shared contact details.',
    });
  }

  async function onChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileId = `${Date.now()}-${slugName(file.name)}`;
    const fileRef = ref(storage, `uploads/${code}/${fileId}`);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on('state_changed', (snap) => {
      setPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
    });

    try {
      await task;
      const url = await getDownloadURL(fileRef);
      await addDoc(msgsCol, {
        from: 'caller',
        at: serverTimestamp(),
        text: file.name,
        fileUrl: url, fileName: file.name, fileType: file.type, fileSize: file.size,
      });
    } catch {
      alert('Upload failed by storage rules. Make sure the session is open and try again.');
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] h-screen">
      <div className="flex flex-col">
        <header className="p-3 text-sm opacity-75">Session <b>{code}</b> — Secure shared chat</header>
        <div ref={scroller} className="flex-1 overflow-auto px-4 space-y-2">
          {msgs.map((m, i) => (
            <div key={i} className="text-sm">
              <div className="opacity-60 uppercase">{m.from}</div>
              {m.text && <div>{m.text}</div>}
              {m.fileUrl && (
                <a href={m.fileUrl} target="_blank" className="underline">
                  {m.fileName} ({Math.round((m.fileSize ?? 0)/1024)} KB)
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 flex gap-2">
          <input
            value={text}
            onChange={(e)=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && send()}
            className="flex-1 rounded px-3 py-2 bg-neutral-900 border border-neutral-700"
            placeholder="Type a message…"
          />
          <button onClick={send} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">Send</button>
        </div>
      </div>

      <aside className="border-l border-neutral-800 p-4 space-y-3">
        <h2 className="font-semibold">Send your details</h2>
        <div className="grid gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="rounded px-3 py-2 bg-neutral-900 border border-neutral-700" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" inputMode="email" className="rounded px-3 py-2 bg-neutral-900 border border-neutral-700" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="rounded px-3 py-2 bg-neutral-900 border border-neutral-700" />
          <button onClick={sendDetails} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700">Send details</button>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-1">File upload (beta)</h3>
          <p className="text-xs opacity-70 mb-2">Allowed: images & PDF · Max 10 MB</p>
          <input type="file" accept="image/*,application/pdf" onChange={onChooseFile} />
          {pct > 0 && pct < 100 && <div className="text-xs mt-2">Uploading… {pct}%</div>}
        </div>
      </aside>
    </div>
  );
}
