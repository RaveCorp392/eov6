"use client";

import { useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

type Props = { code: string; role: "caller" | "agent"; enabled?: boolean };

export default function FileUploader({ code, role, enabled = true }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!enabled) return null;

  const pickFile = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { setErr("Max size is 10 MB."); return; }
    const okType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) { setErr("Allowed types: image/* or PDF"); return; }

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

      // 1) Rich file message (if your getMessages returns all fields, UI shows preview)
      // 2) Text fallback so it *always* appears even if unknown fields are dropped
      await addDoc(collection(db, "sessions", code, "messages"), {
        type: "file",
        role,
        sender: role === "agent" ? "AGENT" : "CALLER",
        file: { name: file.name, size: file.size, contentType: file.type, storagePath: path, downloadURL, url: downloadURL },
        text: downloadURL,                 // <= fallback so it renders now
        createdAt: serverTimestamp(),
      });

      setStatus("done");
      setTimeout(() => setStatus("idle"), 1200);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      console.error(e);
      setErr("Upload failed.");
      setStatus("error");
    }
  };

  return (
    <div className="uploader">
      <button type="button" onClick={pickFile} disabled={status === "uploading"}>
        {status === "uploading" ? `Uploading… ${progress}%` : "Attach file"}
      </button>
      <input ref={inputRef} type="file" onChange={onChange} style={{ display: "none" }} accept="image/*,application/pdf" />
      {status === "done" && <p className="ok">Uploaded ✓</p>}
      {err && <p className="err">{err}</p>}

      <style jsx>{`
        .uploader { display: grid; gap: 6px; }
        button { border-radius: 10px; background: #0284c7; color: #fff; padding: 6px 10px; border: 1px solid #1e293b; }
        button:disabled { opacity: 0.6; }
        .ok { color: #34d399; font-size: 12px; }
        .err { color: #fca5a5; font-size: 12px; }
      `}</style>
    </div>
  );
}
