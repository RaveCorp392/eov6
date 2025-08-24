"use client";

import { useRef, useState } from "react";
import { storage, db, serverTimestamp } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";

type Props = {
  code: string;
  disabled?: boolean;
};

export default function FileUploader({ code, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  async function handlePick() {
    if (disabled || busy) return;
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset
    if (!file) return;

    // quick client-side guard (mirrors rules)
    const isOkType =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isOkType || file.size > 10 * 1024 * 1024) {
      alert("Only images or PDFs up to 10MB.");
      return;
    }

    try {
      setBusy(true);
      setPct(0);

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `uploads/${code}/${Date.now()}-${safeName}`;
      const task = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type,
      });

      task.on("state_changed", (snap) => {
        if (snap.totalBytes > 0) {
          setPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      });

      await task;
      const url = await getDownloadURL(ref(storage, path));

      // write a chat item so the agent sees a link/preview
      await addDoc(collection(db, "sessions", code, "messages"), {
        from: "caller",
        at: serverTimestamp(),
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      setPct(0);
    } catch (err: any) {
      console.error("upload error", err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={handlePick}
        disabled={disabled || busy}
        className="rounded bg-violet-600 text-white px-3 py-2 disabled:opacity-50"
      >
        {busy ? `Uploading… ${pct}%` : "Upload file"}
      </button>
      {busy && (
        <div className="h-2 w-48 rounded bg-slate-200 overflow-hidden">
          <div
            className="h-2 bg-violet-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
