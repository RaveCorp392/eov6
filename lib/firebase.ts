// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getFirestore,
  serverTimestamp as _serverTimestamp,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Public config (Next.js reads NEXT_PUBLIC_* at build and client)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// keep the timestamp helper the codebase already uses
export const serverTimestamp = _serverTimestamp;

// some places import this flag
export const isFirebaseReady = true;

// ✅ export both named and default so either import style works
export { app };
export default app;
