"use client";

import { arrayRemove, arrayUnion, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types/org";
import { useState } from "react";

export default function OrgStaff({ orgId, org, onSaved, canManage = true }:{ orgId: string; org: Org; onSaved: (o: Org)=>void; canManage?: boolean; }){
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const users = org.users ?? [];

  async function invite(){
    const e = email.trim().toLowerCase();
    if (!e) return;
    setBusy(true);
    await setDoc(doc(db, "orgs", orgId), { users: arrayUnion(e) }, { merge: true });
    onSaved({ ...org, users: Array.from(new Set([...(org.users??[]), e])) } as Org);
    setEmail("");
    setBusy(false);
  }
  async function remove(e: string){
    setBusy(true);
    await updateDoc(doc(db, "orgs", orgId), { users: arrayRemove(e) });
    onSaved({ ...org, users: (org.users??[]).filter(u=>u!==e) } as Org);
    setBusy(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-2 items-end">
        <label className="flex-1 grid gap-1">
          <span className="text-sm font-medium">Invite by email</span>
          <input type="email" placeholder="name@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="border rounded px-3 py-2 bg-white dark:bg-slate-900" disabled={!canManage}/>
        </label>
        <button onClick={invite} disabled={busy || !email || !canManage} className="px-4 h-10 rounded bg-blue-600 text-white disabled:opacity-50">Invite</button>
      </div>

      <div className="border rounded">
        <div className="px-3 py-2 border-b text-sm font-medium">Staff</div>
        <ul className="divide-y">
          {users.length===0 && <li className="px-3 py-3 text-slate-500 text-sm">No staff yet.</li>}
          {users.map(u => (
            <li key={u} className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm">{u}</span>
              <button onClick={()=>remove(u)} className="text-sm text-red-600 hover:underline disabled:opacity-50" disabled={!canManage}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
