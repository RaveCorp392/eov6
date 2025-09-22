"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AckItem = {
  id: string;
  title: string;
  body?: string;
};

export type AckStatus = "accepted" | "declined";

type AckModalProps = {
  code: string;
  pendingAck: AckItem | null;
  onClose: () => void;
  onResult?: (status: AckStatus, item: AckItem) => void;
  onError?: (message: string) => void;
};

export default function AckModal({ code, pendingAck, onClose, onResult, onError }: AckModalProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!pendingAck) return null;

  async function writeAck(status: AckStatus) {
    if (busy || !pendingAck) return;
    setBusy(true);
    setErr(null);

    const text =
      status === "accepted"
        ? `Caller accepted: ${pendingAck.title}`
        : `Caller declined: ${pendingAck.title}`;

    try {
      await addDoc(collection(db, "sessions", code, "messages"), {
        role: "system",
        type: "ack",
        text,
        ack: { id: pendingAck.id, title: pendingAck.title, status },
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "sessions", code), {
        [`ackProgress.${pendingAck.id}`]: status === "accepted",
      });

      onResult?.(status, pendingAck);
      onClose();
    } catch (e: any) {
      console.error("[ack] write failed", e?.message || e);
      const message = e?.message || "send failed";
      setErr(message);
      onError?.("Acknowledgement send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">{pendingAck.title}</h3>
        <div className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
          {pendingAck.body || ""}
        </div>
        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            data-testid="ack-decline"
            onClick={() => writeAck("declined")}
            disabled={busy}
            className="rounded border px-3 py-2 text-slate-700 disabled:opacity-60"
          >
            Decline
          </button>
          <button
            data-testid="ack-accept"
            onClick={() => writeAck("accepted")}
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Sending..." : "Accept & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
