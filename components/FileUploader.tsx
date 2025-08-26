'use client';

import React, { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureSessionOpen } from '@/lib/ensureSession';

export default function FileUploader({ code }: { code: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pct, setPct] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      // Make sure the session doc exists and TTL is fresh BEFORE writing to Storage
      await ensureSessionOpen(code);

      const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
      const fileId = `${Date.now()}-${safeName}`;
      const objectRef = ref(storage, `uploads/${code}/${fileId}`);

      const task = uploadBytesResumable(objectRef, file, { contentType: file.type });
      task.on('state_changed', (snap) => {
        const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setPct(percent);
      });

      await task; // wait for completion
      const url = await getDownloadURL(task.snapshot.ref);

      // Post a file message into chat
      await addDoc(collection(db, 'sessions', code, 'messages'), {
        from: 'caller',
        text: `${file.name} (${Math.round(file.size / 1024)} KB)`,
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        at: serverTimestamp(),
      });

      // reset picker
      if (inputRef.current) inputRef.current.value = '';
      setPct(0);
      setBusy(false);
    } catch (err: any) {
      setBusy(false);
      alert('Upload failed by storage rules. Make sure the session is open and try again.');
      // Optional: console.error(err);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm opacity-75">Allowed: images & PDF · Max 10 MB</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPick}
        disabled={busy}
      />
      {busy && <div className="text-xs opacity-75">Uploading… {pct}%</div>}
    </div>
  );
}
