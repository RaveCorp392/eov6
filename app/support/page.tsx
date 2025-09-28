"use client";
import { useState } from "react";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, subject, message })
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      setOk(j.id);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } else alert(j?.error || "Error");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-4">Support</h1>
      <p className="text-zinc-700 mb-6">Email-only support. We’ll reply as soon as possible.</p>
      {ok && (
        <div className="mb-4 rounded bg-emerald-100 text-emerald-900 p-3">
          Thanks — ticket <b>{ok}</b> created.
        </div>
      )}
      <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4" autoComplete="on">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Name</label>
            <input
              autoComplete="name"
              className="w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Email</label>
            <input
              autoComplete="email"
              type="email"
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm">Subject</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Message</label>
          <textarea
            rows={6}
            className="w-full rounded border px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <button disabled={busy} className="rounded-xl bg-blue-600 text-white px-4 py-2">
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </main>
  );
}
