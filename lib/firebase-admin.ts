// lib/firebase-admin.ts
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";
import { getStorage as _getStorage } from "firebase-admin/storage";

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  // Configure GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* envs if not using ADC.
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export function getFirestore() {
  return _getFirestore(app);
}

export function getStorage() {
  return _getStorage(app);
}
