// components/FileUploader.tsx
"use client";

import React, { useRef, useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

type Props = {
  code: string; // session code
  onUploaded?: (info: { name: string; url: string; path: string }) => void;
};

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export default function FileUploader({ code, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      setError("Only images or PDF are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is larger than 10MB.");
      return;
    }

    try {
      const ts = Date.now();
      const cleanName = file.name.replace(/\s+/g, "_");
      const path = `uploads/${code}/${ts}-${cleanName}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed", snap => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });

      await task;
      const url = await getDownloadURL(storageRef);
      setProgress(100);
      onUploaded?.({ name: cleanName, url, path });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Upload failed");
      alert("Upload failed by storage rules. Make sure the session is open and try again.");
    } finally {
      // reset the input so the same file can be chosen again
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onPick}
      />
      <button onClick={pick} className="px-3 py-1 rounded border">
        Choose file
      </button>
      {progress !== null && <div className="text-sm opacity-80">Uploading… {progress}%</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
