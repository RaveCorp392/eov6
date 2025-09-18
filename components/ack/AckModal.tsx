"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc, deleteField } from "firebase/firestore";

export default function AckModal({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [ackId, setAckId] = useState<"privacy" | "slot1" | "slot2" | null>(null);

  useEffect(() => {
    const ref = doc(db, "sessions", code);
    const off = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      if (data.pendingAck?.title && data.pendingAck?.body) {
        setTitle(data.pendingAck.title);
        setBody(data.pendingAck.body);
        setAckId(data.pendingAck?.id || null);
        setOpen(true);
      } else {
        setOpen(false);
      }
    });
    return () => off();
  }, [code]);

  async function accept() {
    const msgs = collection(db, "sessions", code, "messages");
    await addDoc(msgs, {
      role: "system",
      type: "ack",
      text: `Caller accepted: ${title}`,
      ack: { id: ackId || "privacy", title: title || "", status: "accepted" },
      createdAt: serverTimestamp(),
    } as any);
    await updateDoc(doc(db, "sessions", code), { pendingAck: deleteField(), [`ackProgress.${ackId}`]: true } as any);
    setOpen(false);
  }
  async function cancel() {
    const msgs = collection(db, "sessions", code, "messages");
    await addDoc(msgs, {
      role: "system",
      type: "ack",
      text: `Caller declined: ${title}`,
      ack: { id: ackId || "privacy", title: title || "", status: "declined" },
      createdAt: serverTimestamp(),
    } as any);
    await updateDoc(doc(db, "sessions", code), { pendingAck: deleteField(), ...(ackId ? { [`ackProgress.${ackId}`]: false } : {}) } as any);
    setOpen(false);
  }
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
          {body}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button data-testid="ack-decline" onClick={cancel} className="px-3 py-2 rounded border text-slate-700">Decline</button>
          <button data-testid="ack-accept" onClick={accept} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
