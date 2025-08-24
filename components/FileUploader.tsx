"use client";

import { useRef, useState } from "react";
import { storage, db, serverTimestamp } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";

type Props = {
  code: string;
  disabled?: boolean;
  className?: string;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function FileUploader({ code, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number>(0);

  function pick() {
    if (!inputRef.current || disabled || busy) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert("File too large. Max 10 MB.");
      return;
    }
    setBusy(true);
    setPct(0);

    try {
      // sessions/{code}/{timestamp}-{name}
      const key = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `sessions/${code}/${key}`);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on("state_changed", (snap) => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setPct(p);
      });

      await task; // wait for completion

      const url = await getDownloadURL(storageRef);

      // post a chat message that contains a `file` payload
      const msgsRef = collection(db, "sessions", code, "messages");
      await addDoc(msgsRef, {
        from: "caller",
        at: serverTimestamp(),
        file: {
          url,
          name: file.name,
          size: file.size,
          type: file.type,
        },
      });
    } catch (err) {
      console.error("upload error", err);
      alert("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setPct(0);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={onPick}
      />
      <button
        onClick={pick}
        disabled={disabled || busy}
        className={
          className ??
          "rounded bg-violet-600 text-white px-3 py-2 disabled:opacity-50"
        }
      >
        {busy ? `Uploading… ${pct}%` : "Upload file"}
      </button>
    </>
  );
}
