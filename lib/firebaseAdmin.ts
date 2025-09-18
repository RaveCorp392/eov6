// lib/firebaseAdmin.ts
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  try {
    // JSON string?
    return JSON.parse(raw);
  } catch {
    // base64-encoded JSON?
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
}

const app = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(loadServiceAccount()) });

// Export a conventional `db` for server/Admin usage, and keep `adminDb` for existing imports.
export const db = getFirestore(app);
export const adminDb = db;
