// app/admin/orgs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function OrgSettingsPage() {
  const [orgId, setOrgId] = useState('default');
  const [form, setForm] = useState({
    required: true,
    version: '2025-09-07.1',
    title: 'Privacy & Consent',
    linkUrl: '',
    statementText:
      'This secure chat is temporary. Details you provide are used only to assist this call and are cleared when the session ends. Do not submit passwords or full card numbers.',
    retainConsentAuditDays: 0,
  });

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'orgs', orgId));
      const data = snap.data() as any;
      const policy = data?.features?.policy;
      if (policy) setForm((f) => ({ ...f, ...policy }));
    })();
  }, [orgId]);

  async function save() {
    const ref = doc(db, 'orgs', orgId);
    await setDoc(ref, { features: { policy: form } }, { merge: true });
    alert('Saved. New sessions will snapshot this policy.');
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Org Policy Settings</h1>
      <div className="mt-4 grid gap-4">
        <label className="flex items-center gap-2">
          <span className="w-40">Org ID</span>
          <input className="border rounded px-2 py-1" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.required}
            onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
          />
          <span>Require consent before chat</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="w-40">Version</span>
          <input
            className="border rounded px-2 py-1 flex-1"
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="w-40">Title</span>
          <input
            className="border rounded px-2 py-1 flex-1"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="w-40">Link URL</span>
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="https://example.com/privacy"
            value={form.linkUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
          />
        </label>

        <label className="block">
          <div>Statement</div>
          <textarea
            className="border rounded px-2 py-1 w-full h-48"
            value={form.statementText}
            onChange={(e) => setForm((f) => ({ ...f, statementText: e.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="w-40">Keep audit (days)</span>
          <input
            type="number"
            min={0}
            className="border rounded px-2 py-1"
            value={form.retainConsentAuditDays ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, retainConsentAuditDays: Number(e.target.value || 0) }))}
          />
        </label>

        <div className="flex justify-end">
          <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
