// /app/admin/entitlements/page.tsx
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import { requireOwner } from '@/lib/authz';
import { upsertEntitlement, deactivateEntitlement } from '@/lib/entitlements';

async function listEntitlements() {
  const snap = await adminDb.collection('entitlements').orderBy('updatedAt', 'desc').limit(200).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
}

async function createComp(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const plan = String(formData.get('plan') || 'solo_year');
  if (!email) return;
  await upsertEntitlement(email, {
    active: true,
    plan: plan as any,
    priceId: null,
    sessionId: null,
    source: 'manual',
    updatedAt: Date.now(),
  });
}

async function disableEnt(email: string) {
  'use server';
  await deactivateEntitlement(email);
}

export default async function EntitlementsPage() {
  const { ok } = await requireOwner();
  if (!ok) redirect('/');

  const rows = await listEntitlements();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Entitlements</h1>

      <form action={createComp} className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">Email</label>
          <input name="email" className="border rounded px-3 py-2" placeholder="user@company.com" />
        </div>
        <div>
          <label className="block text-sm">Plan</label>
          <select name="plan" className="border rounded px-3 py-2">
            <option value="one_week">one_week</option>
            <option value="solo_month">solo_month</option>
            <option value="team_month">team_month</option>
            <option value="solo_year">solo_year</option>
            <option value="team_year">team_year</option>
          </select>
        </div>
        <button className="rounded bg-black text-white px-4 py-2">Add / Upsert</button>
      </form>

      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Updated</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.plan}</td>
                <td className="p-3">{String(r.active)}</td>
                <td className="p-3">{new Date(r.updatedAt).toLocaleString()}</td>
                <td className="p-3">
                  <form action={async () => disableEnt(r.id)}>
                    <button className="text-red-600 hover:underline">Disable</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
