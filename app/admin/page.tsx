// /app/admin/page.tsx
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireOwner } from '@/lib/authz';

async function getMetrics() {
  const snap = await adminDb.collection('entitlements').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const active = docs.filter(d => d.active);
  const planCounts = active.reduce<Record<string, number>>((acc, d) => {
    acc[d.plan] = (acc[d.plan] ?? 0) + 1;
    return acc;
  }, {});

  // crude MRR-ish based on price map you already keep in /lib/billing
  const priceMap: Record<string, number> = {
    solo_month: 500,
    team_month: 2500,
    solo_year: Math.round(4800 / 12),
    team_year: Math.round(24000 / 12),
  };
  const mrr = active.reduce((sum, d) => sum + (priceMap[d.plan] ?? 0), 0);

  const contactsSnap = await adminDb.collection('contacts').orderBy('createdAt', 'desc').limit(10).get();
  const contacts = contactsSnap.docs.map(d => d.data());

  return { planCounts, mrr, contacts };
}

export default async function AdminHome() {
  const { ok } = await requireOwner();
  if (!ok) redirect('/');

  const { planCounts, mrr, contacts } = await getMetrics();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(planCounts).map(([plan, n]) => (
          <div key={plan} className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">{plan}</div>
            <div className="text-2xl font-semibold">{n}</div>
          </div>
        ))}
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">MRR (est.)</div>
          <div className="text-2xl font-semibold">A${(mrr/100).toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 font-medium">Recent contacts</div>
        <div className="divide-y">
          {contacts.map((c: any) => (
            <div key={c.id} className="p-4 text-sm">
              <div className="font-medium">{c.email}</div>
              {c.name && <div className="text-gray-500">{c.name}</div>}
              {c.message && <div className="text-gray-700 mt-2">{c.message}</div>}
              <div className="text-xs text-gray-400 mt-2">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
