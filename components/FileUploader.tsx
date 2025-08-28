"use client";

import { useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

type Props = {
  code: string;
  role: "caller" | "agent";
};

export default function FileUploader({ code, role }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] =
    useState<"idle" | "uploading" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (role !== "caller") return null;

  const pickFile = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      setErr("Max size is 10 MB.");
      return;
    }
    if (
      !(
        file.type.startsWith("image/") ||
        file.type === "application/pdf"
      )
    ) {
      setErr("Allowed: image/* or PDF");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);

      const path = `uploads/${code}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on("state_changed", (snap) => {
        const pct = Math.round(
          (snap.bytesTransferred / snap.totalBytes) * 100
        );
        setProgress(pct);
      });

      await task;
      const url = await getDownloadURL(storageRef);

      // Write file message to Firestore
      await addDoc(collection(db, "sessions", code, "messages"), {
        role: "caller",
        type: "file",
        file: {
          name: file.name,
          size: file.size,
          contentType: file.type,
          url,
          storagePath: path,
        },
        createdAt: serverTimestamp(),
      });

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
      e.target.value = ""; // reset input
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
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500"
      >
        {status === "uploading" ? `Uploading… ${progress}%` : "Choose file"}
      </button>

      <input
        ref={inputRef}
        type="file"
        onChange={onChange}
        style={{ display: "none" }}
        accept="image/*,application/pdf"
      />

      {status === "done" && (
        <p className="text-green-500 text-sm">Uploaded ✓</p>
      )}
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
}
