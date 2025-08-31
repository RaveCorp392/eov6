// components/CallerDetailsForm.tsx
"use client";

import { useState } from "react";
import { postDetails, uploadFile, type CallerDetails } from "@/lib/firebase";

type Props = { sessionId: string };

export default function CallerDetailsForm({ sessionId }: Props) {
  const [form, setForm] = useState<CallerDetails>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postDetails(sessionId, form);
    } catch (e: any) {
      setErr(e.message ?? "Failed to send details");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadFile(sessionId, f);
      setForm((x) => ({ ...x, uploadedUrl: url }));
    } catch (e: any) {
      setErr(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel" style={{ maxWidth: 560 }}>
      <div className="mb-2 small">Share your details with the agent (optional)</div>

      <input
        className="input mb-2"
        placeholder="Your name"
        value={form.name ?? ""}
        onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
      />
      <input
        className="input mb-2"
        placeholder="you@example.com"
        value={form.email ?? ""}
        onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))}
        inputMode="email"
      />
      <input
        className="input mb-3"
        placeholder="0400 000 000"
        value={form.phone ?? ""}
        onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))}
        inputMode="tel"
      />

      <div className="mb-2">
        <label className="small">File upload (images & PDF, up to 10 MB)</label>
        <input
          type="file"
          className="input mt-1"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={onPickFile}
        />
        {form.uploadedUrl && (
          <div className="small mt-1">
            Uploaded: <a href={form.uploadedUrl}>preview</a>
          </div>
        )}
      </div>

      {err && <div className="small" style={{ color: "#fca5a5" }}>{err}</div>}

      <button className="button" disabled={busy}>
        {busy ? "Sending…" : "Send details"}
      </button>
    </form>
  );
}
