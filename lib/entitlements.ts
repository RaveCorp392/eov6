// Firestore helpers for writing/clearing a user's entitlement.

import { adminDb } from '@/lib/firebase-admin';
import type { Plan } from '@/lib/billing';

export type EntitlementDoc = {
  active: boolean;
  plan: Plan;
  priceId?: string | null;
  source: 'stripe' | 'manual';
  sessionId?: string | null;
  updatedAt: number;

  // Subs (monthly/yearly) – epoch millis
  periodStart?: number | null;
  periodEnd?: number | null;

  // One-week pass – epoch millis
  expiresAt?: number | null;
};

// 🔧 FLAT doc: entitlements/{email}
function refFor(email: string) {
  const id = email.toLowerCase();
  return adminDb.collection('entitlements').doc(id);
}

export async function upsertEntitlement(
  email: string,
  data: Partial<EntitlementDoc>
) {
  const ref = refFor(email);
  await ref.set(
    {
      updatedAt: Date.now(),
      ...data,
    },
    { merge: true }
  );
  return ref;
}

export async function deactivateEntitlement(email: string) {
  return upsertEntitlement(email, { active: false });
}

// Convenience for the one-week pass
export function oneWeekExpiry(fromMs: number = Date.now()) {
  return fromMs + 7 * 24 * 60 * 60 * 1000;
}
