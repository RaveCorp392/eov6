// components/UploadButton.tsx
"use client";
import { useRef, useState } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { Role } from "@/lib/firebase";

export default function UploadButton({ sessionId, role }: { sessionId: string; role: Role }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const key = `uploads/${sessionId}/${Date.now()}-${file.name}`;
      const task = uploadBytesResumable(ref(storage, key), file);
      await task;
      const url = await getDownloadURL(ref(storage, key));
      await addDoc(collection(db, "sessions", sessionId, "messages"), {
        type: "file",
        role,
        url,
        text: file.name,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" className="hidden" onChange={onPick} />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="rounded-xl px-3 py-2 border border-white/10 disabled:opacity-50"
        title="Upload a file"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </>
  );
}

