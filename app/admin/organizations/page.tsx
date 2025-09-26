"use client";

import "@/lib/firebase";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { isInternalAdminClient } from "@/lib/is-internal";

type Row = {
  id: string;
  name?: string;
  domains?: string[];
  features?: { allowUploads?: boolean; translateUnlimited?: boolean };
  billing?: { plan?: string; seats?: number; unitPrice?: number; translateUnlimitedIncluded?: boolean };
  [k: string]: any;
};

export default function AdminOrgsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isInternal, setIsInternal] = useState<boolean | null>(null);

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
    const auth = getAuth();
    const off = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setToken(null);
          setIsInternal(null);
          return;
        }
        const t = await user.getIdToken();
        setToken(t);
        setIsInternal(await isInternalAdminClient());
      } catch (e: any) {
        setError(e?.message || "auth error");
        setIsInternal(false);
      } finally {
        setReady(true);
      }
    });
    return () => off();
  }, []);

  async function adminSignIn() {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const t = await cred.user.getIdToken();
      setToken(t);
      setError(null);
      setIsInternal(await isInternalAdminClient());
    } catch (e: any) {
      setError(e?.message || "sign-in failed");
    }
  }

  useEffect(() => {
    (async () => {
      if (!token || !isInternal) return;
      try {
        const res = await fetch("/api/admin/orgs/list", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          setError(`list failed: ${res.status}${data?.error ? ` - ${data.error}` : ""}`);
          return;
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e: any) {
        setError(`list exception: ${e?.message || e}`);
      }
    })();
  }, [token, isInternal]);

  async function saveEdit() {
    if (!token || !editing) {
      setError("Not signed in");
      return;
    }
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
      if (!res.ok) {
        setError(`save failed: ${res.status}`);
        return;
      }
      setEditOpen(false);
      const refresh = await fetch("/api/admin/orgs/list", { headers: { Authorization: `Bearer ${token}` } });
      if (refresh.ok) {
        const payload = await refresh.json();
        setRows(payload.rows || []);
      }
    } catch (e: any) {
      setError(e?.message || "save failed");
    }
  }

  async function resolveOwner() {
    if (!token || !editing) {
      setError("Not signed in");
      return;
    }
    const ownerEmail = prompt("Owner email to resolve (lowercase):", "");
    if (!ownerEmail) return;
    try {
      const res = await fetch(`/api/admin/orgs/${editing.id}/resolve-owner`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`resolve failed: ${data?.error || res.status}`);
        return;
      }
      alert(data.resolved ? `Resolved to UID ${data.ownerUid}` : "Placeholder written (owner not found)");
    } catch (e: any) {
      setError(e?.message || "resolve failed");
    }
  }

  if (!ready) {
    return <main className="p-6 text-slate-500">Loading...</main>;
  }

  if (!token) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        {error && <div className="mb-4 rounded border border-red-400 bg-red-50 p-3 text-red-900">{error}</div>}
        <section className="rounded-lg border p-4">
          <h1 className="text-xl font-semibold mb-2">Organizations</h1>
          <p className="text-slate-600 mb-3">Sign in on this origin to access Admin.</p>
          <button onClick={adminSignIn} className="px-4 py-2 rounded bg-blue-600 text-white">Sign in with Google</button>
        </section>
      </main>
    );
  }

  if (isInternal === null) {
    return null;
  }

  if (!isInternal) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold mb-4">Admin ? Organizations</h1>
        <p className="text-zinc-700">This area is for EOV6 staff.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Organizations</h1>
      {process.env.NODE_ENV !== "production" && (
        <a href="/api/admin/ping" target="_blank" className="text-xs underline text-slate-400">/api/admin/ping</a>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-50 p-3 text-red-900">
          {error}
        </div>
      )}

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
                    <button
                      className="ml-2 rounded border px-2 py-1 text-red-600"
                      onClick={async () => {
                        if (!confirm(`Delete org '${r.id}'? This cannot be undone.`)) return;
                        const currentToken = await getAuth().currentUser?.getIdToken();
                        if (!currentToken) {
                          alert("Please sign in first.");
                          return;
                        }
                        const res = await fetch("/api/admin/orgs/delete", {
                          method: "POST",
                          headers: { "content-type": "application/json", authorization: `Bearer ${currentToken}` },
                          body: JSON.stringify({ orgId: r.id }),
                        });
                        if (res.ok) {
                          alert("Deleted");
                          window.location.reload();
                        } else {
                          const j = await res.json().catch(() => ({}));
                          alert("Delete failed: " + (j?.error || res.status));
                        }
                      }}
                    >
                      Delete
                    </button>
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
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Domains (csv)</span>
                <input className="border rounded px-3 py-2" value={editForm.domains}
                  onChange={(e) => setEditForm({ ...editForm, domains: e.target.value })} />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editForm.allowUploads}
                  onChange={(e) => setEditForm({ ...editForm, allowUploads: e.target.checked })} />
                Allow Uploads
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editForm.translateUnlimited}
                  onChange={(e) => setEditForm({ ...editForm, translateUnlimited: e.target.checked })} />
                Translate Unlimited (feature)
              </label>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Pricing / Seats</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm">Plan</span>
                  <select className="border rounded px-3 py-2" value={editForm.billingPlan}
                    onChange={(e) => setEditForm({ ...editForm, billingPlan: e.target.value })}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Seats</span>
                  <input type="number" min={1} className="border rounded px-3 py-2" value={editForm.billingSeats}
                    onChange={(e) => setEditForm({ ...editForm, billingSeats: Number(e.target.value) })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Unit price (per seat)</span>
                  <input type="number" step="0.01" className="border rounded px-3 py-2" value={editForm.billingUnitPrice}
                    onChange={(e) => setEditForm({ ...editForm, billingUnitPrice: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editForm.billingTranslateIncluded}
                    onChange={(e) => setEditForm({ ...editForm, billingTranslateIncluded: e.target.checked })} />
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
