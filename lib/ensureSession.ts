// lib/ensureSession.ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function expiryInHours(h: number) {
  return Timestamp.fromDate(new Date(Date.now() + h * 3600 * 1000));
}

/** Ensure sessions/{code} exists with a real Timestamp expiresAt and closed:false */
export async function ensureSessionOpen(code: string) {
  const ref = doc(db, 'sessions', code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Create with a REAL Timestamp (not serverTimestamp) so rules can compare it
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      expiresAt: expiryInHours(1),
      closed: false
    }, { merge: true });
  } else {
    // If expiresAt missing/invalid, refresh it
    const data = snap.data() || {};
    if (!(data.expiresAt instanceof Timestamp) || data.closed === true) {
      await updateDoc(ref, { expiresAt: expiryInHours(1), closed: false });
    }
  }
  return ref;
}
