"use client";

import { useRef, useState } from "react";
import { storage, db, serverTimestamp } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";

function slugName(name: string) {
  return name.replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80);
}

export default function FileUploader({ code }: { code: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pct, setPct] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  function handlePick() {
    inputRef.current?.click();
  }

  async function onFileChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setPct(0);

    try {
      const fileId = `${Date.now()}-${slugName(file.name)}`;
      // must match Storage rules path:
      const fileRef = ref(storage, `uploads/${code}/${fileId}`);

      const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

      task.on("state_changed", (snap: UploadTaskSnapshot) => {
        if (snap.totalBytes) {
          setPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", undefined, reject, () => resolve());
      });

      const url = await getDownloadURL(task.snapshot.ref);

      // Write a chat message pointing to the file
      const msgsRef = collection(db, "sessions", code, "messages");
      await addDoc(msgsRef, {
        from: "caller",
        at: serverTimestamp(),
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      });

      setPct(0);
    } catch (err: any) {
      console.error("upload error", err);
      const msg = String(err?.code || err?.message || err);
      if (msg.includes("storage/unauthorized")) {
        alert("Upload failed by storage rules. Make sure the session is open and try again.");
      } else {
        alert("Upload failed. Please try again.");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onFileChanged}
        accept="image/*,application/pdf"
      />
      <button
        onClick={handlePick}
        disabled={busy}
        className="rounded bg-violet-600 px-3 py-2 text-white disabled:opacity-50"
      >
        Upload file
      </button>
      {busy && (
        <div className="text-xs text-slate-600">
          Uploading… {pct}%
          <div className="h-1 w-40 overflow-hidden rounded bg-slate-200">
            <div className="h-1 bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
