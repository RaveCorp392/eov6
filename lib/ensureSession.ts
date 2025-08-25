// lib/ensureSession.ts
import { db, serverTimestamp } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

export type EnsureOpts = {
  ttlHours?: number;   // default 1
  bumpOnly?: boolean;  // if true, do not create missing doc (rare)
};

// returns true if session is open *after* the call
export async function ensureSessionOpen(code: string, opts: EnsureOpts = {}): Promise<boolean> {
  const ttlHours = opts.ttlHours ?? 1;
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + ttlHours * 60 * 60 * 1000));
  const ref = doc(db, 'sessions', code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    if (opts.bumpOnly) return false;
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      expiresAt,
      closed: false,
    }, { merge: true });
    return true;
  }

  const data = snap.data() || {};
  const closed = data.closed === true;
  const currentExpiry: Timestamp | null = data.expiresAt ?? null;

  // If closed, do not re-open here; return false
  if (closed) return false;

  // Refresh TTL if missing or near past
  if (!currentExpiry || currentExpiry.toMillis() <= Date.now()) {
    await updateDoc(ref, { expiresAt });
  }

  return true;
}
