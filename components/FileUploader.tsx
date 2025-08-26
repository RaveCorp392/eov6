// components/FileUploader.tsx
"use client";

import React, { useRef, useState } from "react";
import { storage } from "@/lib/firebase";
import {
  ref as sref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

type Props = {
  code: string; // session code
};

export default function FileUploader({ code }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only images and PDFs
    if (!/^image\/|application\/pdf$/.test(file.type)) {
      setError("Only images and PDF files are allowed.");
      return;
    }

    setError(null);
    setStatus("uploading");
    setProgress(0);

    const path = `uploads/${code}/${Date.now()}-${file.name}`;
    const r = sref(storage, path);
    const task = uploadBytesResumable(r, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      (err) => {
        setStatus("error");
        setError(err.message || "Upload failed");
      },
      async () => {
        const dl = await getDownloadURL(task.snapshot.ref);
        setUrl(dl);
        setStatus("done");
      }
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm opacity-80">
        <strong>File upload (beta)</strong>
        <div>Allowed: images &amp; PDF · Max 10 MB</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onPick}
        className="px-3 py-1 rounded-md border border-white/20 hover:bg-white/5"
      >
        Choose file
      </button>

      {status === "uploading" && (
        <div className="text-sm">Uploading… {progress}%</div>
      )}
      {status === "done" && url && (
        <div className="text-sm break-all">
          Uploaded ✓ <a href={url}>Open</a>
        </div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
