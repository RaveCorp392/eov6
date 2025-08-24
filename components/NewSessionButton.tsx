"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, randomCode } from "@/lib/code";

type Props = {
  className?: string;
  label?: string;
  /** Optional: visually emphasize (e.g., after ending a session) */
  emphasize?: boolean;
};

export default function NewSessionButton({
  className = "",
  label = "Open Agent Console",
  emphasize = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createAndRoute() {
    if (busy) return;
    setBusy(true);
    try {
      // Try a few times in the unlikely event of a collision
      let code = randomCode();
      for (let i = 0; i < 5; i++) {
        const ref = doc(db, "sessions", code);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          // create session shell; TTL starts now
          await setDoc(
            ref,
            {
              createdAt: serverTimestamp(),
              expiresAt: expiryInHours(1),
              closed: false,
            },
            { merge: true }
          );
          router.push(`/agent/s/${code}`);
          return;
        }
        code = randomCode();
      }
      alert("Could not start a new session. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={createAndRoute}
      disabled={busy}
      className={`rounded ${emphasize ? "bg-violet-600" : "bg-indigo-600"} text-white px-4 py-2 disabled:opacity-50 ${className}`}
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
