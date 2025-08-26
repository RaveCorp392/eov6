// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// REQUIRED: define these in your env (Vercel + local .env.local)
// NEXT_PUBLIC_FIREBASE_API_KEY=...
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
// NEXT_PUBLIC_FIREBASE_APP_ID=...

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Use singleton app (important for Next.js hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// SDK singletons
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper for components to check if Firebase is initialized
export function isFirebaseReady(): boolean {
  try {
    return !!db && !!storage && !!auth;
  } catch {
    return false;
  }
}

export default app;
