"use client";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types/org";
import { useState } from "react";

export default function OrgFeatures({ orgId, org, onSaved }:{ orgId: string; org: Org; onSaved: (o: Org)=>void; }){
  const [allowUploads, setAllowUploads] = useState(Boolean(org.features?.allowUploads));
  const [translateUnlimited, setTranslateUnlimited] = useState(Boolean(org.features?.translateUnlimited));
  const [privacyStatement, setPrivacyStatement] = useState(org.texts?.privacyStatement ?? "");
  const [ackTemplate, setAckTemplate] = useState(org.texts?.ackTemplate ?? "");
  const [slot1Title, setSlot1Title] = useState(org.acks?.slots?.find(s=>s.id==="slot1")?.title ?? "");
  const [slot1Body, setSlot1Body] = useState(org.acks?.slots?.find(s=>s.id==="slot1")?.body ?? "");
  const [slot1Required, setSlot1Required] = useState(Boolean(org.acks?.slots?.find(s=>s.id==="slot1")?.required));
  const [slot2Title, setSlot2Title] = useState(org.acks?.slots?.find(s=>s.id==="slot2")?.title ?? "");
  const [slot2Body, setSlot2Body] = useState(org.acks?.slots?.find(s=>s.id==="slot2")?.body ?? "");
  const [slot2Required, setSlot2Required] = useState(Boolean(org.acks?.slots?.find(s=>s.id==="slot2")?.required));
  const [busy, setBusy] = useState(false);

  async function save(){
    setBusy(true);
    const slots = [
      (slot1Title.trim() || slot1Body.trim()) ? {
        id: "slot1" as const,
        title: slot1Title.replace(/\r\n?/g, "\n").trim().slice(0,120),
        body: slot1Body.replace(/\r\n?/g, "\n").trim().slice(0,2000),
        required: Boolean(slot1Required),
        order: 1 as const,
      } : null,
      (slot2Title.trim() || slot2Body.trim()) ? {
        id: "slot2" as const,
        title: slot2Title.replace(/\r\n?/g, "\n").trim().slice(0,120),
        body: slot2Body.replace(/\r\n?/g, "\n").trim().slice(0,2000),
        required: Boolean(slot2Required),
        order: 2 as const,
      } : null,
    ].filter(Boolean) as any[];
    const next = {
      features: {
        allowUploads,
        translateUnlimited,
      },
      texts: {
        privacyStatement: privacyStatement.trim(),
        ackTemplate: ackTemplate.trim(),
      },
      acks: { slots },
    };
    await setDoc(doc(db, "orgs", orgId), next, { merge: true });
    onSaved({ ...org, ...next } as Org);
    setBusy(false);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h3 className="font-medium">Toggles</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowUploads} onChange={e=>setAllowUploads(e.target.checked)} />
          <span className="text-sm">Enable file uploads (images/PDF)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={translateUnlimited} onChange={e=>setTranslateUnlimited(e.target.checked)} />
          <span className="text-sm">Translate add-on (unlimited) — skip metering in /api/translate</span>
        </label>
      </div>

      <div className="grid gap-2">
        <h3 className="font-medium">Privacy Statement (shown to callers)</h3>
        <textarea value={privacyStatement} onChange={e=>setPrivacyStatement(e.target.value)} rows={4} className="border rounded px-3 py-2 w-full bg-white dark:bg-slate-900" placeholder="e.g. We collect only the information necessary to assist with your enquiry. All data here is ephemeral and cleared when your session ends."/>
      </div>

      <div className="grid gap-2">
        <h3 className="font-medium">Personalised Acknowledgement Text</h3>
        <textarea value={ackTemplate} onChange={e=>setAckTemplate(e.target.value)} rows={4} className="border rounded px-3 py-2 w-full bg-white dark:bg-slate-900" placeholder="e.g. I confirm that the details provided are accurate to the best of my knowledge."/>
        <p className="text-xs text-slate-500">Used by the Ack modal; does not overwrite the caller name. Keep it short and plain-language.</p>
      </div>

      <div className="grid gap-2">
        <h3 className="font-medium">Acknowledgement templates (2 org-defined steps)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Slot 1 — Title</span>
            <input value={slot1Title} onChange={e=>setSlot1Title(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-slate-900" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Slot 2 — Title</span>
            <input value={slot2Title} onChange={e=>setSlot2Title(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-slate-900" />
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Slot 1 — Body</span>
          <textarea rows={4} value={slot1Body} onChange={e=>setSlot1Body(e.target.value)} className="border rounded px-3 py-2 w-full bg-white dark:bg-slate-900" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Slot 2 — Body</span>
          <textarea rows={4} value={slot2Body} onChange={e=>setSlot2Body(e.target.value)} className="border rounded px-3 py-2 w-full bg-white dark:bg-slate-900" />
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={slot1Required} onChange={e=>setSlot1Required(e.target.checked)} />
            <span>Slot 1 required</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={slot2Required} onChange={e=>setSlot2Required(e.target.checked)} />
            <span>Slot 2 required</span>
          </label>
        </div>
        <p className="text-xs text-slate-500">Titles are truncated to 120 chars; bodies to 2000 chars. Leave blank to hide a slot.</p>
      </div>

      <div>
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{busy?"Saving…":"Save features"}</button>
      </div>
    </div>
  );
}
