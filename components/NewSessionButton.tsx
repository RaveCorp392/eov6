"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"; // <-- from firestore
import { db } from "@/lib/firebase";                               // <-- keep db from our lib
import { getAuth } from "firebase/auth";
import { resolveOrgIdFromEmail } from "@/lib/org-resolver";
import { devlog } from "@/lib/devlog";
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
      const email = (getAuth().currentUser?.email || "").toLowerCase();
      const orgId = resolveOrgIdFromEmail(email) || "default";
      await setDoc(
        doc(db, "sessions", code),
        {
          orgId,
          ackProgress: {},
          createdAt: serverTimestamp(),
          expiresAt: expiryInHours(1),
          closed: false,
        },
        { merge: true }
      );
      try {
        const snap = await getDoc(doc(db, "sessions", code));
        devlog("session-create", { code, orgIdWritten: snap.get("orgId"), exists: snap.exists() });
      } catch {}
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
