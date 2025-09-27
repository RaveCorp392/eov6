"use client";
import { useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";

export default function AdminOrgNewPage() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [domains, setDomains] = useState("");
  const [seats, setSeats] = useState(5);
  const [allowUploads, setAllowUploads] = useState(true);
  const [translateUnlimited, setTranslateUnlimited] = useState(true);
  const [privacy, setPrivacy] = useState("");
  const [ack1t, setAck1t] = useState("");
  const [ack1b, setAck1b] = useState("");
  const [ack1r, setAck1r] = useState(false);
  const [ack2t, setAck2t] = useState("");
  const [ack2b, setAck2b] = useState("");
  const [ack2r, setAck2r] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    try {
      setBusy(true);
      const t = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/admin/orgs/create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
        body: JSON.stringify({
          orgId: slug,
          name,
          adminEmail,
          seats,
          domains: domains.split(",").map((s) => s.trim()).filter(Boolean),
          features: { allowUploads, translateUnlimited },
          privacyStatement: privacy,
          ack1: { title: ack1t, body: ack1b, required: ack1r },
          ack2: { title: ack2t, body: ack2b, required: ack2r }
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || res.statusText);
      alert("Created: " + j.orgId);
    } catch (e: any) {
      alert("Create failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Admin — New Organization</h1>
      <p className="text-sm text-zinc-600 mb-6">Staff-only. One screen, everything set.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Org ID</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Admin email</label>
          <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Domains (csv)</label>
          <input value={domains} onChange={(e) => setDomains(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Seats</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value || "0", 10))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>
      <div className="flex gap-6 my-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowUploads} onChange={(e) => setAllowUploads(e.target.checked)} /> Allow
          Uploads
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={translateUnlimited}
            onChange={(e) => setTranslateUnlimited(e.target.checked)}
          />
          Translate Unlimited
        </label>
      </div>
      <div className="mb-4">
        <label className="block text-sm">Privacy Statement</label>
        <textarea
          rows={6}
          className="w-full border rounded px-3 py-2"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Ack 1 Title</label>
          <input value={ack1t} onChange={(e) => setAck1t(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">Ack 2 Title</label>
          <input value={ack2t} onChange={(e) => setAck2t(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Ack 1 Body</label>
          <textarea
            rows={4}
            className="w-full border rounded px-3 py-2"
            value={ack1b}
            onChange={(e) => setAck1b(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Ack 2 Body</label>
          <textarea
            rows={4}
            className="w-full border rounded px-3 py-2"
            value={ack2b}
            onChange={(e) => setAck2b(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ack1r} onChange={(e) => setAck1r(e.target.checked)} /> Ack 1 required
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ack2r} onChange={(e) => setAck2r(e.target.checked)} /> Ack 2 required
        </label>
      </div>
      <button disabled={busy} onClick={create} className="mt-4 rounded-xl bg-blue-600 text-white px-4 py-2">
        {busy ? "Working…" : "Create"}
      </button>
    </main>
  );
}
