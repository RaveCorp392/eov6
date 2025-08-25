// lib/firebase.ts
// Firebase v9+/v10 modular setup that works in Next.js (SSR/CSR).
// Exports: app, db, storage, auth, googleProvider,
//          serverTimestamp, Timestamp, and a stub isFirebaseReady().

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Read config from public env vars. Keep empty strings at build time to avoid type errors.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Avoid re‑init on hot reload/server reuses.
const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Re‑export useful Firestore types/helpers
export { serverTimestamp, Timestamp };

// ----- Legacy/helper export to satisfy older imports -----
// Some parts of the app (or legacy routes) import `isFirebaseReady`.
// We return true once an app instance exists.
export function isFirebaseReady(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

export default app;
