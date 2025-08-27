'use client';

import React, { useRef, useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // ensure your lib/firebase exports { db }
                                     // (if it's a default export, change to: import firebase from '@/lib/firebase'; const { db } = firebase;)

type Props = {
  code: string;                              // session code
  role: 'caller' | 'agent';                  // who is uploading (for transcript)
  accept?: string;                           // optional: e.g. "image/*,application/pdf"
};

export default function FileUploader({ code, role, accept = 'image/*,application/pdf' }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);

  async function handlePick(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      setPct(0);
      setLastName(file.name);

      const storage = getStorage();
      // store under uploads/{code}/{timestamp}-{sanitizedName}
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `uploads/${code}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || undefined,
      });

      task.on('state_changed', snap => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setPct(progress);
      });

      await task; // wait for completion
      const url = await getDownloadURL(task.snapshot.ref);

      // write a chat message so both sides see “file uploaded”
      await addDoc(collection(db, 'sessions', code, 'messages'), {
        role,                          // "caller" or "agent"
        type: 'file',                  // <- ChatWindow will render specially
        name: file.name,
        url,
        contentType: file.type || null,
        size: file.size,
        createdAt: serverTimestamp(),
      });

      // optional toast—keep it quiet
    } catch (err) {
      alert('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
      setPct(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePick}
        className="block w-full max-w-xs text-xs file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white file:hover:bg-white/20 cursor-pointer"
      />
      {busy && (
        <span className="min-w-[5rem]">{pct !== null ? `${pct}%` : 'Uploading…'}</span>
      )}
      {!busy && lastName && <span className="opacity-70">Uploaded ✓</span>}
    </div>
  );
}
