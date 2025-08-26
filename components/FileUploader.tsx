'use client';

import React, { useRef, useState } from 'react';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Props = {
  code: string;                    // session code
  role: 'agent' | 'caller';
};

export default function FileUploader({ code, role }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const onPick = () => inputRef.current?.click();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic allow-list (client-side only; rules should enforce for real)
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!okTypes.includes(file.type)) {
      alert('Please upload an image (png/jpg/webp) or PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File is over 10 MB limit.');
      e.target.value = '';
      return;
    }

    void doUpload(file);
  };

  const doUpload = async (file: File) => {
    try {
      setBusy(true);
      setProgress(0);

      // Path: uploads/{code}/{timestamp}-{filename}
      const storage = getStorage();
      const stamp = Date.now();
      const cleanName = file.name.replace(/\s+/g, '-');
      const path = `uploads/${code}/${stamp}-${cleanName}`;
      const ref = storageRef(storage, path);

      const task = uploadBytesResumable(ref, file, {
        contentType: file.type,
        cacheControl: 'public,max-age=3600',
      });

      task.on(
        'state_changed',
        (snap: UploadTaskSnapshot) => {
          // Firebase v10: use totalBytes, not total
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress(pct);
        },
        (err) => {
          console.error(err);
          alert('Upload failed by storage rules. Make sure the session is open and try again.');
          setBusy(false);
          setProgress(0);
        },
        async () => {
          // Finished — get URL and post a message into the session chat
          const url = await getDownloadURL(task.snapshot.ref);

          // Write a chat message: sessions/{code}/messages
          await addDoc(collection(db, 'sessions', code, 'messages'), {
            from: role,              // 'agent' | 'caller'
            type: 'file',
            name: file.name,
            size: file.size,
            mime: file.type,
            path,                    // storage path
            url,                     // download URL
            ts: serverTimestamp(),
          });

          setBusy(false);
          setProgress(100);
          // reset input so the same file can be chosen again later
          if (inputRef.current) inputRef.current.value = '';
        }
      );
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-sm border border-white/15 disabled:opacity-60"
      >
        {busy ? 'Uploading…' : 'Choose file'}
      </button>

      {progress > 0 && (
        <span className="text-xs text-white/75">{progress}%</span>
      )}
    </div>
  );
}
