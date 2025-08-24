// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Minimal “am I in the browser?” flag that callers can use
 * to avoid running client-only Firebase code on the server.
 * (Your pages/components already treat this as a boolean.)
 */
export const isFirebaseReady = typeof window !== "undefined";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Reuse the existing app if it’s already been initialized
export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth (client-only usage)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Convenience re-exports
export { serverTimestamp, Timestamp };
