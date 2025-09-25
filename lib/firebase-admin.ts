// lib/firebase-admin.ts
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";
import { getStorage as _getStorage } from "firebase-admin/storage";

/**
 * Auth:
 * - Preferred: FIREBASE_SERVICE_ACCOUNT = stringified service-account JSON.
 * - Fallback: GOOGLE_APPLICATION_CREDENTIALS (ADC).
 * Optional: FIREBASE_STORAGE_BUCKET (e.g., eov6.appspot.com).
 */
const app = getApps()[0] ?? initializeApp(
  process.env.FIREBASE_SERVICE_ACCOUNT
    ? {
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      }
    : {
        credential: applicationDefault(),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      }
);

export function getFirestore() {
  return _getFirestore(app);
}
export function getStorage() {
  return _getStorage(app);
}
