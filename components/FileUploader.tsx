// components/FileUploader.tsx
"use client";

import { useRef, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, serverTimestamp } from "@/lib/firebase";

type Props = { code: string };

export default function FileUploader({ code }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  function pick() {
    inputRef.current?.click();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024; // 10MB cap
    if (file.size > maxBytes) {
      alert("File too large (max 10MB).");
      e.target.value = "";
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const path = `sessions/${code}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      const task = uploadBytesResumable(r, file, { contentType: file.type || undefined });

      task.on("state_changed", snap => {
        // ✅ Use totalBytes (not `total`)
        if (snap.totalBytes) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress(pct);
        }
      });

      await task;
      const url = await getDownloadURL(r);

      await addDoc(collection(db, "sessions", code, "messages"), {
        from: "caller",
        at: serverTimestamp(),
        fileUrl: url,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      });

      setProgress(100);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onPick}
      />
      <button
        onClick={pick}
        disabled={busy}
        className="rounded bg-violet-600 text-white px-3 py-2 disabled:opacity-50"
      >
        {busy ? `Uploading… ${progress}%` : "Upload file"}
      </button>
      {busy && (
        <div className="h-2 w-40 rounded bg-slate-200 overflow-hidden">
          <div className="h-2 bg-violet-600" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
