// lib/firebaseAdmin.ts
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

function initFromServiceAccountKey() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApp();
    return adminApp;
  }

  // Prefer trio envs if provided, else fall back to FIREBASE_SERVICE_ACCOUNT_KEY
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  let credentialInput: any = null;
  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    credentialInput = { projectId, clientEmail, privateKey };
  } else {
    credentialInput = initFromServiceAccountKey();
  }

  if (!credentialInput) {
    throw new Error("Missing Admin SDK env: set FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_KEY");
  }

  adminApp = initializeApp({ credential: cert(credentialInput) });
  return adminApp;
}

// Export a conventional `db` for server/Admin usage, and keep `adminDb` for existing imports.
export const db = getFirestore(getAdminApp());
export const adminDb = db;

// New helpers if you prefer call-style usage
export const adminAuth = () => getAuth(getAdminApp());
export const adminDbFn = () => getFirestore(getAdminApp());
