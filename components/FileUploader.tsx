"use client";

import React, { useRef, useState } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase"; // your initialized Firestore/Apps here
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type Props = {
  code: string;                    // session code
  role: "agent" | "caller";        // who is posting
  accept?: string;                 // optional override (defaults images+pdf)
  maxSizeMb?: number;              // soft guardrail
  className?: string;
};

export default function FileUploader({
  code,
  role,
  accept = "image/*,application/pdf",
  maxSizeMb = 10,
  className = ""
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`File is over ${maxSizeMb}MB.`);
      e.currentTarget.value = "";
      return;
    }

    setBusy(true);
    setProgress(0);

    try {
      const storage = getStorage();
      // path: /uploads/<session>/<ts>-<sanitized-name>
      const stamp = Date.now();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const objectPath = `uploads/${code}/${stamp}-${safeName}`;
      const storageRef = ref(storage, objectPath);

      const task = uploadBytesResumable(storageRef, file);

      task.on("state_changed", snap => {
        if (snap.totalBytes) setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });

      await task; // wait for completion
      const url = await getDownloadURL(storageRef);

      // Write a chat message (link-only, no auto image tag here)
      await addDoc(collection(db, "sessions", code, "messages"), {
        ts: serverTimestamp(),
        role,
        type: "file",
        name: file.name,
        size: file.size,
        mime: file.type,
        url
      });

      // Reset picker
      if (inputRef.current) inputRef.current.value = "";
      setProgress(null);
      alert("Uploaded ✓");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePick}
        disabled={busy}
        className="cursor-pointer rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
      />
      {progress !== null && (
        <span className="text-xs text-slate-400">{progress}%</span>
      )}
    </div>
  );
}
