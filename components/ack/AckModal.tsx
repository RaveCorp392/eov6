"use client";

import { useState } from "react";

export type AckItem = {
  id: string;
  title: string;
  body?: string;
};

export type AckStatus = "accepted" | "declined";

type AckModalProps = {
  pendingAck: AckItem | null;
  onAccept: (item: AckItem) => Promise<void> | void;
  onDecline: (item: AckItem) => Promise<void> | void;
  onClose?: () => void;
};

export default function AckModal({ pendingAck, onAccept, onDecline, onClose }: AckModalProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!pendingAck) return null;

  async function handle(action: "accept" | "decline") {
    if (busy || !pendingAck) return;
    setBusy(true);
    setErr(null);
    try {
      if (action === "accept") {
        await onAccept(pendingAck);
      } else {
        await onDecline(pendingAck);
      }
      onClose?.();
    } catch (e: any) {
      const message = e?.message || "send failed";
      setErr(message);
      console.error("[ack-modal]", message, e);
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
            onClick={() => handle("decline")}
            disabled={busy}
            className="rounded border px-3 py-2 text-slate-700 disabled:opacity-60"
          >
            Decline
          </button>
          <button
            data-testid="ack-accept"
            onClick={() => handle("accept")}
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
