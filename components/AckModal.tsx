// components/AckModal.tsx
"use client";
import { useState } from "react";
import { clearAck, saveDetails, sendMessage } from "@/lib/firebase";

type AckRequest = {
  title?: string;
  body?: string;
  text?: string; // fallback support
  requireName?: boolean;
};

interface Props {
  sessionId: string;
  ackRequest?: AckRequest | null;
}

export default function AckModal({ sessionId, ackRequest }: Props) {
  const [name, setName] = useState("");

  // Narrow so TS knows ackRequest is defined below
  if (!ackRequest) return null;
  const request: AckRequest = ackRequest; // narrowed

  async function accept() {
    if (request.requireName && !name.trim()) return;
    if (name.trim()) await saveDetails(sessionId, { name: name.trim() });
    await sendMessage(sessionId, {
      sender: "caller",
      type: "system",
      text: `Acknowledgement accepted by ${name?.trim() || "caller"}.`,
    });
    await clearAck(sessionId);
  }

  async function decline() {
    await sendMessage(sessionId, { sender: "caller", type: "system", text: "Acknowledgement declined." });
    await clearAck(sessionId);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-[min(600px,92vw)] rounded-2xl bg-white text-slate-900 p-6">
        <h2 className="text-lg font-semibold">{request.title ?? "Acknowledgement"}</h2>
        <p className="mt-3 whitespace-pre-wrap">{request.body ?? request.text ?? ""}</p>

        {request.requireName && (
          <input
            className="mt-4 w-full rounded-lg border px-3 py-2"
            placeholder="Type your full name to sign"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={decline} className="px-4 py-2 rounded-lg border">
            Decline
          </button>
          <button onClick={accept} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
