"use client";

import { useRef, useState } from "react";
import { db, serverTimestamp, storage } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

type Props = {
  code: string;               // session code
  className?: string;
};

export default function UploadButton({ code, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  const pick = () => inputRef.current?.click();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX) {
      alert("File too large (max 10 MB).");
      e.target.value = "";
      return;
    }

    try {
      setBusy(true);
      setPct(0);

      const path = `uploads/${code}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      const task = uploadBytesResumable(r, file, {
        customMetadata: {
          "x-eov6-session": code,
          "x-eov6-filename": file.name,
        },
      });

      task.on("state_changed", s => {
        if (s.totalBytes) {
          setPct(Math.round((s.bytesTransferred / s.totalBytes) * 100));
        }
      });

      await task;
      const url = await getDownloadURL(r);

      const msgsRef = collection(db, "sessions", code, "messages");
      await addDoc(msgsRef, {
        from: "caller",
        at: serverTimestamp(),
        text: "", // render via file* fields
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setPct(0);
      e.target.value = "";
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={onPick}
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="rounded bg-violet-600 text-white px-3 py-2 disabled:opacity-50"
      >
        {busy ? `Uploading… ${pct}%` : "Upload file"}
      </button>
    </div>
  );
}
