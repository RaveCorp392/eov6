"use client";

import React, { useRef, useState } from "react";
import { storage, db, serverTimestamp } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";

type Props = {
  code: string;            // 6-digit session code
  role?: "CALLER" | "AGENT";
};

export default function UploadButton({ code, role = "CALLER" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      setProgress(0);

      const path = `uploads/${code}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      task.on("state_changed", (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      });

      await task;
      const url = await getDownloadURL(storageRef);

      // Emit a chat event so the agent sees a clickable file link (no inline preview)
      await addDoc(collection(db, "sessions", code, "events"), {
        type: "file",
        name: file.name,
        size: file.size,
        url,
        path,
        role,
        ts: serverTimestamp(),
      });

      // Reset input so the same file can be picked again if needed
      if (inputRef.current) inputRef.current.value = "";
      setProgress(0);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button onClick={onPick} disabled={busy}>
        {busy ? `Uploading ${progress}%` : "Choose file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={onChange}
      />
    </div>
  );
}
