// /app/admin/page.tsx
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
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
  redirect('/admin/organizations');
}
