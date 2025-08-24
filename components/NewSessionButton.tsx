"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, randomCode } from "@/lib/code";

type Props = {
  className?: string;
  label?: string;
  emphasize?: boolean;
};

export default function NewSessionButton({
  className = "",
  label = "Open Agent Console",
  emphasize = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      const code = randomCode();
      await setDoc(
        doc(db, "sessions", code),
        {
          createdAt: serverTimestamp(),
          expiresAt: expiryInHours(1),
          closed: false,
        },
        { merge: true }
      );
      router.push(`/agent/s/${code}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`rounded ${emphasize ? "bg-indigo-600 text-white" : "border"} px-4 py-2 disabled:opacity-50 ${className}`}
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
