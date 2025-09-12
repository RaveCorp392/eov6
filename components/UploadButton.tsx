// components/UploadButton.tsx
"use client";

import { useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Props = {
  sessionId: string;
  role: "caller" | "agent";
  disabled?: boolean;
};

export default function UploadButton({ sessionId, role, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      // storage path: uploads/<session>/<timestamp>-<filename>
      const key = `uploads/${sessionId}/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, key);

      // simple one-shot upload (fine for MVP)
      await uploadBytes(fileRef, file, { contentType: file.type });

      const url = await getDownloadURL(fileRef);

      // drop a "file" message into the chat
      await addDoc(collection(db, "sessions", sessionId, "messages"), {
        role,
        type: "file",
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        url,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      // clear chooser so the same file can be reselected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPickFile}
        disabled={disabled || busy}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        title={busy ? "Uploading…" : "Upload a file"}
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </>
  );
}
