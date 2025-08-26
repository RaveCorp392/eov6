// lib/firebase.ts
// Single place to initialize Firebase and export typed helpers.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, serverTimestamp, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

// Pull config from env (Next.js exposes NEXT_PUBLIC_* to the client)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function ensureApp(): FirebaseApp {
  // SSR/edge safe: don’t re-init if already created.
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const app: FirebaseApp = ensureApp();
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/** Small convenience used by a couple of pages to guard code paths. */
export function isFirebaseReady(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

export {
  app,
  db,
  storage,
  auth,
  googleProvider,
  serverTimestamp, // re-export for callers that import from "@/lib/firebase"
};
