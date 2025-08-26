// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getFirestore,
  // re-exports for convenience across the app
  serverTimestamp as _serverTimestamp,
  Timestamp as _Timestamp,
  FieldValue as _FieldValue,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Required env (Vercel + .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton Firebase app (important for Next.js)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// SDK singletons
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Convenience re-exports so components can import from "@/lib/firebase"
export const serverTimestamp = _serverTimestamp;
export type Timestamp = _Timestamp;
export type FieldValue = _FieldValue;

// Simple readiness check used in a couple places
export function isFirebaseReady(): boolean {
  try {
    return !!db && !!storage && !!auth;
  } catch {
    return false;
  }
}

export default app;
