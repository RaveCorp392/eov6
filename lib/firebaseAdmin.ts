// lib/firebase-admin.ts
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type SA = { project_id: string; client_email: string; private_key: string };

let app: App;

if (!getApps().length) {
  // Support either FIREBASE_SERVICE_ACCOUNT (JSON) or the triplet envs
  let projectId = process.env.FIREBASE_PROJECT_ID || "";
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if ((!projectId || !clientEmail || !privateKey) && saJson) {
    try {
      const sa = JSON.parse(saJson) as SA;
      projectId ||= sa.project_id;
      clientEmail ||= sa.client_email;
      privateKey ||= sa.private_key;
    } catch {
      // ignore parse errors; triplet may still be present
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY."
    );
  }

  // ✅ Always provide a valid bucket at init time
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`).trim();

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
} else {
  app = getApps()[0]!;
}

export const db = getFirestore(app);
export const bucket = getStorage(app).bucket(); // safe: bucket name guaranteed above
