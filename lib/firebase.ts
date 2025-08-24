// lib/firebase.ts
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore,
  // re-export commonly used Firestore helpers so pages can import from "@/lib/firebase"
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ---- Config (all public keys are fine client-side) ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ---- App singletons ----
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Auth (for /admin)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper some pages referenced
export const isFirebaseReady = getApps().length > 0;

// Re-exports (so imports like `import { db, serverTimestamp } from "@/lib/firebase"` keep working)
export {
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
};

