"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type Row = { id: string; name?: string; domains?: string[]; [k: string]: any };

export default function AdminOrgsPage() {
  const [form, setForm] = useState<any>({ orgId: "", name: "", ownerEmail: "", domains: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) return;
      const t = await u.getIdToken();
      setToken(t);
      try {
        const res = await fetch("/api/admin/orgs/list", { headers: { Authorization: `Bearer ${t}` } });
        const data = await res.json();
        if (res.ok) setRows(data.rows || []);
      } catch {}
    });
    return () => off();
  }, []);

  async function submit() {
    if (!token) return alert("Not signed in");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orgs/create", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orgId: String(form.orgId || "").trim().toLowerCase(),
          name: String(form.name || "").trim(),
          ownerEmail: String(form.ownerEmail || "").trim().toLowerCase(),
          domains: String(form.domains || "").split(",").map((s: string) => s.trim()).filter(Boolean),
          features: { allowUploads: !!form.allowUploads, translateUnlimited: !!form.translateUnlimited },
          acks: {
            slots: [
              { id: "slot1", title: form.slot1Title || "", body: form.slot1Body || "", required: !!form.slot1Required, order: 1 },
              { id: "slot2", title: form.slot2Title || "", body: form.slot2Body || "", required: !!form.slot2Required, order: 2 },
            ],
          },
          commissions: form.commissions || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(`Error: ${data?.error || res.status}`);
      alert(`Created ${data.orgId}${data.placeholder ? " (owner placeholder)" : ""}`);
      // refresh list
      try {
        const r = await fetch("/api/admin/orgs/list", { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (r.ok) setRows(j.rows || []);
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Organizations</h1>

      <section className="rounded-lg border p-4 mb-6 space-y-3">
        <h2 className="font-medium">Create Organization</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Org ID (slug)</span>
            <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Name</span>
            <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Owner email</span>
            <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Domains (csv)</span>
            <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.allowUploads} onChange={(e) => setForm({ ...form, allowUploads: e.target.checked })} />
            Allow Uploads
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.translateUnlimited} onChange={(e) => setForm({ ...form, translateUnlimited: e.target.checked })} />
            Translate Unlimited
          </label>
        </div>

        <div className="grid gap-2 mt-3">
          <h3 className="font-medium">Ack templates (optional)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Slot 1 Title</span>
              <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.slot1Title || ""} onChange={(e) => setForm({ ...form, slot1Title: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Slot 2 Title</span>
              <input className="border rounded px-3 py-2 bg-white text-slate-900" value={form.slot2Title || ""} onChange={(e) => setForm({ ...form, slot2Title: e.target.value })} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-sm">Slot 1 Body</span>
            <textarea className="border rounded px-3 py-2 bg-white text-slate-900" rows={3} value={form.slot1Body || ""} onChange={(e) => setForm({ ...form, slot1Body: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Slot 2 Body</span>
            <textarea className="border rounded px-3 py-2 bg-white text-slate-900" rows={3} value={form.slot2Body || ""} onChange={(e) => setForm({ ...form, slot2Body: e.target.value })} />
          </label>
          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.slot1Required} onChange={(e) => setForm({ ...form, slot1Required: e.target.checked })} />
              Slot 1 required
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.slot2Required} onChange={(e) => setForm({ ...form, slot2Required: e.target.checked })} />
              Slot 2 required
            </label>
          </div>
        </div>

        <div className="mt-3">
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{busy ? "Creating…" : "Create Organization"}</button>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-2">Existing</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Org ID</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Domains</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{r.id}</td>
                  <td className="px-2 py-1">{r.name || ""}</td>
                  <td className="px-2 py-1">{Array.isArray(r.domains) ? r.domains.join(", ") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

