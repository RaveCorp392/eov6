"use client";

import { useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

type Props = {
  code: string;
  /** who is uploading on this device */
  role: "caller" | "agent";
  /** allow hiding the control via feature flag or parent gate */
  enabled?: boolean;
};

export default function FileUploader({ code, role, enabled = true }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] =
    useState<"idle" | "uploading" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!enabled) return null;

  const pickFile = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Limits: <= 10MB, images or PDF
    if (file.size > 10 * 1024 * 1024) {
      setErr("Max size is 10 MB.");
      return;
    }
    const okType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      setErr("Allowed types: image/* or PDF");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `uploads/${code}/${Date.now()}-${safeName}`;
      const objectRef = ref(storage, path);

      const task = uploadBytesResumable(objectRef, file, { contentType: file.type });
      task.on("state_changed", (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      });

      await task;
      const downloadURL = await getDownloadURL(objectRef);

      // Post a chat "file" message so both sides see it
      await addDoc(collection(db, "sessions", code, "messages"), {
        type: "file",
        // be liberal in what we write so renderers can adapt
        role,                                  // 'agent' | 'caller'
        sender: role === "agent" ? "AGENT" : "CALLER",
        file: {
          name: file.name,
          size: file.size,
          contentType: file.type,
          storagePath: path,
          downloadURL,                         // preferred
          url: downloadURL,                    // legacy/fallback
        },
        createdAt: serverTimestamp(),
      });

      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      console.error(e);
      setErr("Upload failed.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-2 max-w-md">
      <button
        type="button"
        onClick={pickFile}
        disabled={status === "uploading"}
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {status === "uploading" ? `Uploading… ${progress}%` : "Attach file"}
      </button>

      <input
        ref={inputRef}
        type="file"
        onChange={onChange}
        style={{ display: "none" }}
        accept="image/*,application/pdf"
      />

      {status === "done" && <p className="text-green-500 text-sm">Uploaded ✓</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
