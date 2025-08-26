'use client';

import React, { useRef, useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Props = {
  code: string;               // session code
  role: 'caller' | 'agent';   // who is posting the file
};

export default function FileUploader({ code, role }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus('uploading');
    setProgress(0);

    const storage = getStorage(); // uses default initialized app
    const safeName = file.name.replace(/[^\w.\-]/g, '_'); // defensive
    const path = `uploads/${code}/${Date.now()}-${safeName}`;
    const fileRef = ref(storage, path);

    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress(pct);
        }
      },
      (err) => {
        setStatus('error');
        setError(err?.message ?? 'Upload failed');
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);

          // append a chat message in Firestore for this session
          const messagesCol = collection(db, 'sessions', code, 'messages');
          await addDoc(messagesCol, {
            role,                    // 'caller' | 'agent'
            type: 'file',
            name: file.name,
            size: file.size,
            contentType: file.type,
            storagePath: path,
            url,                     // handy for immediate display
            createdAt: serverTimestamp(),
          });

          setStatus('done');
          setProgress(100);
          // reset input so same file can be selected again if needed
          if (inputRef.current) inputRef.current.value = '';
        } catch (e: any) {
          setStatus('error');
          setError(e?.message ?? 'Failed to record file message');
        }
      }
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
      <h3 className="mb-2 text-sm font-semibold text-white/90">File upload (beta)</h3>
      <p className="mb-3 text-xs text-white/60">Allowed: images & PDF · Max 10&nbsp;MB</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPick}
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:bg-white/[0.08]"
          disabled={status === 'uploading'}
        >
          Choose file
        </button>

        {status === 'uploading' && (
          <span className="text-xs text-white/70">Uploading… {progress}%</span>
        )}
        {status === 'done' && <span className="text-xs text-emerald-400">Uploaded ✓</span>}
        {status === 'error' && <span className="text-xs text-rose-400">{error}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
