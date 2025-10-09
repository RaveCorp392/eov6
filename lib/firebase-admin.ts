import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let _app: App | undefined;

/** Lazy, idempotent Admin init. Safe at build & runtime. */
function initApp(): App {
  if (_app) return _app;

  // Support either FIREBASE_SERVICE_ACCOUNT (JSON) or the triplet envs
  let projectId = process.env.FIREBASE_PROJECT_ID || "";
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if ((!projectId || !clientEmail || !privateKey) && sa) {
    try {
      const j = JSON.parse(sa) as ServiceAccount;
      projectId ||= j.project_id;
      clientEmail ||= j.client_email;
      privateKey ||= j.private_key;
    } catch {
      /* ignore JSON parse errors; triplet may still be present */
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY."
    );
  }

  // Always provide a bucket so bucket() never throws at build time.
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`).trim();

  if (!getApps().length) {
    _app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket,
    });
  } else {
    _app = getApps()[0]!;
  }
  return _app!;
}

/** Preferred accessors */
export function getAdminApp(): App {
  return initApp();
}
export const db: Firestore = getFirestore(getAdminApp());
export const bucket = getStorage(getAdminApp()).bucket();

/** Back-compat aliases used around the codebase */
export const adminDb: Firestore = db;
export const adminBucket = bucket;