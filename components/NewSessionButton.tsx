"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, randomCode } from "@/lib/code";

type Props = {
  className?: string;
  label?: string;
  /** Optional: make the button visually stronger (used after ending a session) */
  emphasize?: boolean;
};

/**
 * Creates a fresh session (unique code) and routes the agent to /agent/s/[code].
 * Use on /agent or inline in the console after "End session".
 */
export default function NewAgentSessionButton({
  className = "",
  label = "Open Agent Console",
  emphasize = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      // Try a few codes to avoid a (rare) collision.
      let code = "";
      for (let i = 0; i < 6; i++) {
        const c = randomCode();
        const ref = doc(db, "sessions", c);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            createdAt: serverTimestamp(),
            expiresAt: expiryInHours(1),
            closed: false,
          });
          code = c;
          break;
        }
      }
      if (!code) throw new Error("Could not allocate a session code");
      router.push(`/agent/s/${code}`);
    } finally {
      setBusy(false);
    }
  }

  const visual =
    emphasize
      ? "bg-indigo-700 shadow-md hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-400"
      : "bg-indigo-600 hover:bg-indigo-700";

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`rounded text-white px-4 py-2 disabled:opacity-50 ${visual} ${className}`}
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
