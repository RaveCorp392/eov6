// components/UploadButton.tsx
"use client";

import { useState, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  code: string;
  role: "caller" | "agent";
};

export default function UploadButton({ code, role }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      setProgress(0);

      const storage = getStorage();
      // Keep files names unique to avoid browser cache/collision:
      const stamp = Date.now();
      const cleanName = file.name.replace(/\s+/g, "-").toLowerCase();
      const path = `uploads/${code}/${stamp}-${cleanName}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || "application/octet-stream",
      });

      task.on("state_changed", (snap: UploadTaskSnapshot) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      });

      await task;
      const url = await getDownloadURL(storageRef);

      // Announce into the chat stream
      await addDoc(collection(db, "sessions", code, "messages"), {
        role,
        kind: "file",
        name: file.name,
        path,
        url,
        size: file.size,
        contentType: file.type || null,
        createdAt: serverTimestamp(),
      });

      setProgress(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed by storage rules. Make sure the session is open and try again.");
      setProgress(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-white/90">File upload (beta)</p>
        <p className="text-xs text-slate-400">Allowed: images & PDF • Max 10 MB</p>
        {progress !== null && (
          <p className="mt-1 text-xs text-sky-300">Uploading… {progress}%</p>
        )}
      </div>

      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Choose file"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
