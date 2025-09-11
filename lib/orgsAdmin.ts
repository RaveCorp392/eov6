// lib/orgsAdmin.ts  (server-only; OK to use Admin SDK)
import { adminDb } from '@/lib/firebaseAdmin';
import type { Org, OrgMember } from '@/lib/types';

export async function createOrg(
  id: string,
  name: string,
  ownerEmail: string,
  plan: Org['plan'],
  seats = 5
) {
  const now = Date.now();
  const doc: Org = {
    id,
    name,
    ownerEmail: ownerEmail.toLowerCase(),
    plan,
    seats,
    createdAt: now,
    updatedAt: now,
  };
  await adminDb.collection('orgs').doc(id).set(doc);

  const owner: OrgMember = {
    email: ownerEmail.toLowerCase(),
    role: 'owner',
    invitedAt: now,
    joinedAt: now,
    status: 'active',
  };
  await adminDb.collection('orgs').doc(id).collection('members').doc(owner.email).set(owner);
}

export async function addMember(orgId: string, email: string, role: OrgMember['role'] = 'member') {
  const now = Date.now();
  const m: OrgMember = { email: email.toLowerCase(), role, invitedAt: now, status: 'invited' };
  await adminDb.collection('orgs').doc(orgId).collection('members').doc(m.email).set(m);
}

export async function removeMember(orgId: string, email: string) {
  await adminDb.collection('orgs').doc(orgId).collection('members').doc(email.toLowerCase()).delete();
}
