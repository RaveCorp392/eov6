"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  /** session code/id used in your URLs */
  code: string;
  /** caller-side typically true for identity fields, agent-side usually false */
  showIdentityFields?: boolean;
  /** agent-side notes toggle */
  showNotes?: boolean;
  /** label for the submit button */
  submitLabel?: string;
  /** called after successful save */
  onSubmitted?: () => void;
  /** who is editing: "AGENT" | "CALLER" */
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
  const [form, setForm] = useState<CallerDetails>({
    name: "",
    phone: "",
    email: "",
    language: "",
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update =
    (k: keyof CallerDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setErr("Missing session code.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      // write to a *document* inside the subcollection to avoid odd-segment path
      const ref = doc(db, "sessions", code, "details", "profile");

      // strip empty fields
      const payload: CallerDetails = Object.fromEntries(
        Object.entries(form).filter(([, v]) => `${v ?? ""}`.trim() !== "")
      ) as CallerDetails;

      await setDoc(
        ref,
        {
          ...payload,
          updatedAt: serverTimestamp(),
          updatedBy: actor,
        },
        { merge: true }
      );

      setOk(true);
      onSubmitted?.();
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      console.error(e);
      setErr("Failed to save details.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      {showIdentityFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="rounded-xl border border-slate-700 bg-[#0b1327] p-3"
            placeholder="Name"
            value={form.name ?? ""}
            onChange={update("name")}
          />
          <input
            className="rounded-xl border border-slate-700 bg-[#0b1327] p-3"
            placeholder="Language (optional)"
            value={form.language ?? ""}
            onChange={update("language")}
          />
          <input
            className="rounded-xl border border-slate-700 bg-[#0b1327] p-3"
            placeholder="Phone"
            value={form.phone ?? ""}
            onChange={update("phone")}
          />
          <input
            className="rounded-xl border border-slate-700 bg-[#0b1327] p-3"
            placeholder="Email"
            type="email"
            value={form.email ?? ""}
            onChange={update("email")}
          />
        </div>
      )}

      {showNotes && (
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-[#0b1327] p-3"
          rows={3}
          placeholder="Notes for agent (private to console)"
          value={form.notes ?? ""}
          onChange={update("notes")}
        />
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-sky-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {sending ? "Saving…" : submitLabel}
        </button>
        {ok && <span className="text-emerald-400 text-sm">Saved ✓</span>}
        {err && <span className="text-red-400 text-sm">{err}</span>}
      </div>
    </form>
  );
}
