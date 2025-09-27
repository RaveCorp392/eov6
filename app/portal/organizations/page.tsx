"use client";

import { useState, type FormEvent } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import MyOrgButton from "@/components/MyOrgButton";

export default function PortalOrganizationsPage() {
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [domainCsv, setDomainCsv] = useState("");
  const [allowUploads, setAllowUploads] = useState(false);
  const [translateUnlimited, setTranslateUnlimited] = useState(false);
  const [privacyStatement, setPrivacyStatement] = useState("");
  const [slot1Title, setSlot1Title] = useState("");
  const [slot2Title, setSlot2Title] = useState("");
  const [slot1Body, setSlot1Body] = useState("");
  const [slot2Body, setSlot2Body] = useState("");
  const [slot1Req, setSlot1Req] = useState(false);
  const [slot2Req, setSlot2Req] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId || !name) {
      alert("Org ID and Name are required");
      return;
    }
    setBusy(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Please sign in first.");
        setBusy(false);
        return;
      }

      const domains = domainCsv.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/portal/orgs/create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orgId: orgId.trim(),
          name,
          ownerEmail: ownerEmail.trim(),
          domains,
          features: { allowUploads, translateUnlimited },
          privacyStatement,
          ack1: { title: slot1Title, body: slot1Body, required: !!slot1Req },
          ack2: { title: slot2Title, body: slot2Body, required: !!slot2Req },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || res.statusText || "Request failed");
      }

      const payload = await res.json();
      if (!payload?.ok) {
        throw new Error(payload?.error || "Create failed");
      }

      alert("Organization created.");
      setOrgId("");
      setName("");
      setOwnerEmail("");
      setDomainCsv("");
      setAllowUploads(false);
      setTranslateUnlimited(false);
      setPrivacyStatement("");
      setSlot1Title("");
      setSlot1Body("");
      setSlot2Title("");
      setSlot2Body("");
      setSlot1Req(false);
      setSlot2Req(false);
    } catch (e: any) {
      alert("Create failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-4">
        <MyOrgButton toAdminIfStaff />
      </div>
      <h1 className="text-2xl font-bold mb-4">Organizations</h1>

      <form onSubmit={onCreate} className="rounded-2xl border p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Org ID (slug)</label>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Owner email</label>
            <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Domains (csv)</label>
            <input value={domainCsv} onChange={(e) => setDomainCsv(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allowUploads} onChange={(e) => setAllowUploads(e.target.checked)} /> Allow Uploads
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={translateUnlimited} onChange={(e) => setTranslateUnlimited(e.target.checked)} /> Translate Unlimited
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium">Privacy Statement</label>
          <textarea value={privacyStatement} onChange={(e) => setPrivacyStatement(e.target.value)} rows={6} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Slot 1 Title</label>
            <input value={slot1Title} onChange={(e) => setSlot1Title(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Slot 2 Title</label>
            <input value={slot2Title} onChange={(e) => setSlot2Title(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Slot 1 Body</label>
            <textarea value={slot1Body} onChange={(e) => setSlot1Body(e.target.value)} rows={4} className="w-full rounded border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Slot 2 Body</label>
            <textarea value={slot2Body} onChange={(e) => setSlot2Body(e.target.value)} rows={4} className="w-full rounded border px-3 py-2" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={slot1Req} onChange={(e) => setSlot1Req(e.target.checked)} /> Slot 1 required
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={slot2Req} onChange={(e) => setSlot2Req(e.target.checked)} /> Slot 2 required
          </label>
        </div>

        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 text-white px-4 py-2">
          {busy ? "Creating..." : "Create Organization"}
        </button>
      </form>
    </main>
  );
}

