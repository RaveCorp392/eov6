"use client";

import React, { useRef, useState } from "react";
import {
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  db,
  collection,
  addDoc,
  serverTimestamp,
} from "@/lib/firebase";

type Props = {
  sessionCode: string;
  role: "CALLER" | "AGENT";
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = "image/*,application/pdf";

export default function UploadButton({ sessionCode, role }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError("File too large (max 10 MB).");
      e.target.value = "";
      return;
    }

    try {
      setBusy(true);
      // upload to storage
      const path = `sessions/${sessionCode}/${Date.now()}-${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);

      // write event
      await addDoc(collection(db, "sessions", sessionCode, "events"), {
        type: "FILE",
        role,
        name: file.name,
        size: file.size,
        url,
        contentType: file.type,
        ts: serverTimestamp(),
      });
    } catch (err: any) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      // reset input so same filename can be reselected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onPick}
        aria-label="Choose file to upload"
        className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-sky-400 file:cursor-pointer file:focus:outline-none file:focus:ring-2 file:focus:ring-sky-400/60"
        disabled={busy}
      />
      {busy && <span className="text-xs text-white/70">Uploading…</span>}
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </div>
  );
}
