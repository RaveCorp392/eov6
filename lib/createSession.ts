// lib/createSession.ts
'use client';

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deriveOrgIdFromEmail } from '@/lib/orgs';
import type { PolicyConfig, PolicySnapshot } from '@/types/policy';

export function randomSecret(len = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let s = '';
  const cryptoObj: any = typeof crypto !== 'undefined' ? crypto : null;
  if (cryptoObj && 'getRandomValues' in cryptoObj) {
    const arr = new Uint8Array(len);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
    return s;
  }
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createNewSessionWithPolicy(email: string, code: string) {
  const orgId = deriveOrgIdFromEmail(email);
  const orgRef = doc(db, 'orgs', orgId);
  const orgSnap = await getDoc(orgRef);
  const features = (orgSnap.exists() ? (orgSnap.data() as any).features : {}) || {};

  const policy: PolicyConfig = features.policy ?? {
    required: false,
    version: 'none',
    title: 'Privacy notice',
    statementText: 'This chat is temporary and clears when you finish.',
  };

  const uploadSecret = randomSecret(48);
  const policySnapshot: PolicySnapshot = {
    ...policy,
    snapAt: serverTimestamp(),
    orgId,
  } as any;

  const sessRef = doc(db, 'sessions', code);
  await setDoc(
    sessRef,
    {
      orgId,
      createdAt: serverTimestamp(),
      closed: false,
      featuresSnapshot: { allowUploads: Boolean(features?.allowUploads) },
      uploadSecret,
      policySnapshot,
      consent: { accepted: !policy.required, version: policy.version },
    },
    { merge: true }
  );

  return { orgId, uploadSecret, policySnapshot };
}
