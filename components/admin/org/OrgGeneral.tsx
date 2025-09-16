"use client";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types/org";
import { useState } from "react";

export default function OrgGeneral({ orgId, org, onSaved }:{ orgId: string; org: Org; onSaved: (o: Org)=>void; }){
  const [name, setName] = useState(org.name ?? "");
  const [domains, setDomains] = useState((org.domains ?? []).join(", "));
  const [logoUrl, setLogoUrl] = useState(org.logoUrl ?? "");
  const [busy, setBusy] = useState(false);
  async function save(){
    setBusy(true);
    const next = {
      name: name.trim(),
      domains: domains.split(",").map(s=>s.trim()).filter(Boolean),
      logoUrl: logoUrl.trim(),
    };
    await setDoc(doc(db, "orgs", orgId), next, { merge: true });
    onSaved({ ...org, ...next } as Org);
    setBusy(false);
  }
  return (
    <div className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Organisation name</span>
          <input className="border rounded px-3 py-2 bg-white dark:bg-slate-900" value={name} onChange={e=>setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Logo URL</span>
          <input className="border rounded px-3 py-2 bg-white dark:bg-slate-900" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Allowed email domains (comma-separated)</span>
        <input className="border rounded px-3 py-2 bg-white dark:bg-slate-900" value={domains} onChange={e=>setDomains(e.target.value)} />
      </label>
      <div>
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{busy?"Saving…":"Save changes"}</button>
      </div>
    </div>
  );
}

