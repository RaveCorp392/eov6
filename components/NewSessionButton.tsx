"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();

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
  const auth = getAuth();
  const [busy, setBusy] = useState(false);

  async function resolveActiveOrg(): Promise<string | null> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null;
    if (stored) return stored;
    const email = auth.currentUser?.email?.toLowerCase() || '';
    if (!email) return null;
    const snap = await getDoc(doc(db, 'entitlements', email));
    const mapped = snap.exists() ? ((snap.data() as any)?.orgId || null) : null;
    if (mapped && typeof window !== 'undefined') localStorage.setItem('activeOrgId', mapped);
    return mapped;
  }

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('not_authenticated');
      const activeOrgId = await resolveActiveOrg();
      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activeOrgId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText);
      if (json?.code) router.push(`/agent/s/${json.code}`);
    } catch (e: any) {
      alert(e?.message || 'start_failed');
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
