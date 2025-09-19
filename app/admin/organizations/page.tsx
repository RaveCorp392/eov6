"use client";

import "@/lib/firebase"; // ensure single firebase client init
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type Row = {
  id: string;
  name?: string;
  domains?: string[];
  features?: { allowUploads?: boolean; translateUnlimited?: boolean };
  billing?: { plan?: string; seats?: number; unitPrice?: number; translateUnlimitedIncluded?: boolean };
  [k: string]: any;
};

export default function AdminOrgsPage() {
  const [form, setForm] = useState<any>({ orgId: "", name: "", ownerEmail: "", domains: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  function openEdit(r: Row) {
    setEditing(r);
    setEditForm({
      name: r.name || "",
      domains: (r.domains || []).join(", "),
      allowUploads: !!r.features?.allowUploads,
      translateUnlimited: !!r.features?.translateUnlimited,
      billingPlan: r.billing?.plan || "starter",
      billingSeats: r.billing?.seats ?? 1,
      billingUnitPrice: r.billing?.unitPrice ?? 0,
      billingTranslateIncluded: !!r.billing?.translateUnlimitedIncluded,
    });
    setEditOpen(true);
  }

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), async (u) => {
      try {
        if (!u) {
          setToken(null);
          return;
        }
        const t = await u.getIdToken();
        setToken(t);
      } catch (e: any) {
        setError(e?.message || "auth error");
      } finally {
        setReady(true);
      }
    });
    return () => off();
  }, []);

  // Fetch list once authenticated
  useEffect(() => {
    (async () => {
      if (!token) return; // unauthenticated; wait for sign in
      try {
        const r = await fetch("/api/admin/orgs/list", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.ok === false) {
          setError(`list failed: ${r.status}${j?.error ? ` — ${j.error}` : ""}`);
          return;
        }
        setRows(Array.isArray(j.rows) ? j.rows : []);
      } catch (e: any) {
        setError(`list exception: ${e?.message || e}`);
      }
    })();
  }, [token]);

  async function submit() {
    if (!token) { setError("Not signed in"); return; }
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
      if (!res.ok) { setError(`create failed: ${data?.error || res.status}`); return; }
      // Optionally show a lightweight success note
      setError(null);
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

  async function saveEdit() {
    if (!token || !editing) { setError("Not signed in"); return; }
    const body = {
      name: editForm.name,
      domains: String(editForm.domains || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      features: { allowUploads: !!editForm.allowUploads, translateUnlimited: !!editForm.translateUnlimited },
      billing: {
        plan: editForm.billingPlan,
        seats: Number(editForm.billingSeats || 0),
        unitPrice: Number(editForm.billingUnitPrice || 0),
        translateUnlimitedIncluded: !!editForm.billingTranslateIncluded,
      },
    };
    try {
      const res = await fetch(`/api/admin/orgs/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError(`save failed: ${res.status}`); return; }
      setEditOpen(false);
      // refresh table
      const r = await fetch("/api/admin/orgs/list", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const j = await r.json(); setRows(j.rows || []); }
    } catch (e: any) {
      setError(e?.message || "save failed");
    }
  }

  async function resolveOwner() {
    if (!token || !editing) { setError("Not signed in"); return; }
    const ownerEmail = prompt("Owner email to resolve (lowercase):", "");
    if (!ownerEmail) return;
    try {
      const res = await fetch(`/api/admin/orgs/${editing.id}/resolve-owner`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(`resolve failed: ${data?.error || res.status}`); return; }
      alert(data.resolved ? `Resolved to UID ${data.ownerUid}` : "Placeholder written (owner not found)");
    } catch (e: any) {
      setError(e?.message || "resolve failed");
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Organizations</h1>
      {process.env.NODE_ENV !== "production" && (
        <a href="/api/admin/ping" target="_blank" className="text-xs underline text-slate-400">/api/admin/ping</a>
      )}
      {!ready && <p className="text-sm text-slate-500">Loading…</p>}
      {ready && !token && (
        <div className="mb-4 rounded border border-amber-400 bg-amber-50 p-3 text-amber-900">
          Sign in required to use Admin.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-50 p-3 text-red-900">
          {error}
        </div>
      )}

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
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{r.id}</td>
                  <td className="px-2 py-1">{r.name || ""}</td>
                  <td className="px-2 py-1">{Array.isArray(r.domains) ? r.domains.join(", ") : ""}</td>
                  <td className="px-2 py-1 text-right">
                    <button className="px-2 py-1 rounded bg-slate-800 text-white" onClick={() => openEdit(r)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white text-slate-900 w-[680px] max-w-[95%] rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Edit {editing?.id}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Name</span>
                <input className="border rounded px-3 py-2" value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Domains (csv)</span>
                <input className="border rounded px-3 py-2" value={editForm.domains}
                  onChange={e => setEditForm({ ...editForm, domains: e.target.value })} />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editForm.allowUploads}
                  onChange={e => setEditForm({ ...editForm, allowUploads: e.target.checked })} />
                Allow Uploads
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editForm.translateUnlimited}
                  onChange={e => setEditForm({ ...editForm, translateUnlimited: e.target.checked })} />
                Translate Unlimited (feature)
              </label>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Pricing / Seats</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Plan</span>
                  <select className="border rounded px-3 py-2" value={editForm.billingPlan}
                    onChange={e => setEditForm({ ...editForm, billingPlan: e.target.value })}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Seats</span>
                  <input type="number" min={1} className="border rounded px-3 py-2" value={editForm.billingSeats}
                    onChange={e => setEditForm({ ...editForm, billingSeats: Number(e.target.value) })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Unit price (per seat)</span>
                  <input type="number" step="0.01" className="border rounded px-3 py-2" value={editForm.billingUnitPrice}
                    onChange={e => setEditForm({ ...editForm, billingUnitPrice: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editForm.billingTranslateIncluded}
                    onChange={e => setEditForm({ ...editForm, billingTranslateIncluded: e.target.checked })} />
                  Translate Unlimited included in plan
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button className="px-3 py-2 rounded bg-slate-200" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={saveEdit}>Save</button>
              <button className="px-3 py-2 rounded bg-slate-800 text-white" onClick={resolveOwner}>Resolve owner</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
