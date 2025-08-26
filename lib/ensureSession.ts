import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Ensure sessions/{code} exists and is "open" with a fresh TTL.
 * Returns a promise you can await before uploads or writes.
 */
export async function ensureSessionOpen(code: string, hours = 1) {
  const expiresAt = Timestamp.fromMillis(Date.now() + hours * 60 * 60 * 1000);
  await setDoc(
    doc(db, 'sessions', code),
    {
      createdAt: serverTimestamp(),
      expiresAt,
      closed: false,
    },
    { merge: true }
  );
}
