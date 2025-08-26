'use client';

import React, { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

type Props = {
  code: string; // session code
};

export default function FileUploader({ code }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneUrl, setDoneUrl] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setDoneUrl(null);
    setProgress(0);

    // Upload path MUST match storage.rules
    const storage = getStorage(app);
    const cleanName = file.name.replace(/\s+/g, '-');
    const objectPath = `uploads/${code}/${Date.now()}-${cleanName}`;
    const storageRef = ref(storage, objectPath);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    task.on(
      'state_changed',
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      },
      err => {
        console.error('upload error', err);
        setError(err?.message || 'Upload failed by storage rules. Make sure the session is open and try again.');
        setBusy(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          setDoneUrl(url);
        } catch (e: any) {
          setError(e?.message || 'Could not fetch download URL.');
        } finally {
          setBusy(false);
        }
      }
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80">File upload (beta)</label>
      <p className="text-xs opacity-60">Allowed: images & PDF • Max 10 MB</p>

      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={onChange}
        disabled={busy}
        className="block"
      />

      {progress !== null && (
        <div className="text-xs opacity-70">Uploading… {progress}%</div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      {doneUrl && (
        <div className="text-xs break-all">
          Uploaded ✓ <a href={doneUrl} target="_blank" className="underline">Open</a>
        </div>
      )}
    </div>
  );
}
