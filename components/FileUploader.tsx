'use client';

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { ensureSessionOpen } from '@/lib/ensureSession';

function slugName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\\.]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function FileUploader({ code }: { code: string; }) {
  const [pct, setPct] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await ensureSessionOpen(code);  // ✅ parent doc exists before upload

      const fileId = `${Date.now()}-${slugName(file.name)}`;
      const fileRef = ref(storage, `uploads/${code}/${fileId}`);

      const task = uploadBytesResumable(fileRef, file, { contentType: file.type || undefined });
      task.on('state_changed', (snap) => {
        setPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });

      await task;
      const url = await getDownloadURL(task.snapshot.ref);

      await addDoc(collection(db, 'sessions', code, 'messages'), {
        from: 'caller',
        at: serverTimestamp(),
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      setPct(0);
    } catch (err: any) {
      console.error(err);
      alert('Upload failed by storage rules. Make sure the session is open and try again.');
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  }

  return (
    <div className="col" style={{gap: 6}}>
      <input type="file" accept="image/*,application/pdf" onChange={handleChange} disabled={busy} />
      {busy ? <div className="small">Uploading… {pct}%</div> : null}
    </div>
  );
}
