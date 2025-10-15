import { Timestamp } from 'firebase/firestore';
import { normalizeSlug } from '@/lib/slugify';

export type TrialSource = 'ads' | 'organic';

export interface TrialInfo {
  used: boolean;
  startedAt?: Timestamp | Date;
  endsAt?: Timestamp | Date;
  source?: TrialSource;
  utm?: Record<string, string>;
}

export function trialEnabled() {
  return (process.env.TRIAL_ENABLE ?? '0') === '1';
}

/** compute end date 30d after start */
export function computeTrialEnd(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return end;
}

/** very conservative eligibility: allow if no existing plan or trial flags */
export async function isTrialEligible(
  db: FirebaseFirestore.Firestore,
  orgSlug: string,
  email: string
) {
  const org = normalizeSlug(orgSlug);

  // org-scoped block: if org has plan active skip
  const orgRef = db.collection('orgs').doc(org);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) return { ok: false, reason: 'org_not_found' as const };

  // if you keep entitlements per email:
  const entSnap = await db.collection('entitlements').doc(email).get();
  const ent = entSnap.exists ? (entSnap.data() as any) : null;
  const plan = ent?.plan ?? null;
  if (plan && plan !== 'none') return { ok: false, reason: 'already_subscribed' as const };

  // optional: card fingerprint fencing is done after checkout via webhook
  return { ok: true as const };
}
