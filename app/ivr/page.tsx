'use client';

import { useState, useEffect } from 'react';
import { db, isFirebaseReady } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Optional: small helper to ensure a test doc exists (safe no-op if it already does)
async function ensureIVRDoc() {
  if (!isFirebaseReady()) return;
  const ref = doc(db, 'ivr', 'status');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { createdAt: serverTimestamp(), ok: true }, { merge: true });
  }
}

export default function IVRPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureIVRDoc().finally(() => setReady(true));
  }, []);

  return (
    <div className="panel" style={{ maxWidth: 640, margin: '40px auto' }}>
      <h2>IVR</h2>
      <p className="small">This page compiles cleanly and keeps legacy imports happy.</p>
      <p>Firebase ready: <strong>{isFirebaseReady() ? 'Yes' : 'No'}</strong></p>
      <p>Status: <strong>{ready ? 'Initialized' : 'Initializing…'}</strong></p>
    </div>
  );
}
