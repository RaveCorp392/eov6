// app/lib/firebase.ts (or /lib/firebase.ts if that's your alias target)
"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your envs must be defined (NEXT_PUBLIC_* in Vercel)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize exactly once (works on client/nav)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Core SDK singletons
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Google provider (named export you were importing)
const googleProvider = new GoogleAuthProvider();

// Small helper some files were importing in builds
export const isFirebaseReady = () => !!getApps().length;

export { app, auth, db, storage, googleProvider };
export default app;
