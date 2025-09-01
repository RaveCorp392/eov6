"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  code: string;
  showIdentityFields?: boolean;
  showNotes?: boolean;
  submitLabel?: string;
  onSubmitted?: () => void;
  actor?: "AGENT" | "CALLER";
};

type CallerDetails = {
  name?: string;
  phone?: string;
  email?: string;
  language?: string;
  notes?: string;
};

export default function CallerDetailsForm({
  code,
  showIdentityFields = true,
  showNotes = false,
  submitLabel = "Save details",
  onSubmitted,
  actor = "CALLER",
}: Props) {
  const [form, setForm] = useState<CallerDetails>({});
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prefill on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = doc(db, "sessions", code, "details", "profile");
        const snap = await getDoc(ref);
        if (alive && snap.exists()) {
          const data = snap.data() as CallerDetails;
          setForm({
            name: data.name ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            language: data.language ?? "",
            notes: data.notes ?? "",
          });
        }
      } catch (e) {
        console.warn("details prefill failed", e);
      }
    })();
    return () => { alive = false; };
  }, [code]);

  const update =
    (k: keyof CallerDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErr(null);
    try {
      const ref = doc(db, "sessions", code, "details", "profile");
      const payload: CallerDetails = Object.fromEntries(
        Object.entries(form).filter(([, v]) => `${v ?? ""}`.trim() !== "")
      ) as CallerDetails;
      await setDoc(ref, { ...payload, updatedAt: serverTimestamp(), updatedBy: actor }, { merge: true });
      setOk(true);
      onSubmitted?.();
      setTimeout(() => setOk(false), 1200);
    } catch (e) {
      console.error(e);
      setErr("Failed to save details.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="form">
      {showIdentityFields && (
        <div className="grid">
          <input placeholder="Name" value={form.name ?? ""} onChange={update("name")} />
          <input placeholder="Language (optional)" value={form.language ?? ""} onChange={update("language")} />
          <input placeholder="Phone" value={form.phone ?? ""} onChange={update("phone")} />
          <input placeholder="Email" type="email" value={form.email ?? ""} onChange={update("email")} />
        </div>
      )}

      {showNotes && (
        <textarea rows={3} placeholder="Notes for agent (private to console)" value={form.notes ?? ""} onChange={update("notes")} />
      )}

      <div className="actions">
        <button type="submit" disabled={sending}>{sending ? "Saving…" : submitLabel}</button>
        {ok && <span className="ok">Saved ✓</span>}
        {err && <span className="err">{err}</span>}
      </div>

      <style jsx>{`
        .form { max-width: 720px; display: grid; gap: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        input, textarea {
          background: #0b1327; color: #e6eefb; border: 1px solid #1e293b; border-radius: 12px; padding: 10px;
        }
        textarea { width: 100%; }
        .actions { display: flex; gap: 10px; align-items: center; }
        button { background: #0284c7; color: #fff; border: 1px solid #1e293b; border-radius: 12px; padding: 8px 12px; }
        button:disabled { opacity: 0.6; }
        .ok { color: #34d399; font-size: 12px; }
        .err { color: #fca5a5; font-size: 12px; }
      `}</style>
    </form>
  );
}
