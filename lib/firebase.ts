// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  collection,
  addDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Pull from Vercel/Next public envs
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Ensure single app instance (works in dev + serverless)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---- Auth ----
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ---- Firestore ----
export const db = getFirestore(app);
export { serverTimestamp, collection, addDoc, doc, setDoc };

// ---- Storage (for uploads) ----
export const storage = getStorage(app);

// (Optional) tiny helper you can import if you want a simple guard
export const firebaseReady = Boolean(app);
