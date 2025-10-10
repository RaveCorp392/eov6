import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore as _getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type SA = { project_id: string; client_email: string; private_key: string };

let _app: App | undefined;

function projectIdFromEnv(): string {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    try {
      return (JSON.parse(sa) as SA).project_id;
    } catch {
      // ignore
    }
  }
  return "";
}

function resolveBucketName(pid: string): string {
  const explicit = (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    ""
  ).trim();
  if (explicit) return explicit;
  if (pid) return `${pid}.firebasestorage.app`;
  return "";
}

export function getAdminApp(): App {
  if (_app) return _app;

  let projectId = process.env.FIREBASE_PROJECT_ID || "";
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if ((!projectId || !clientEmail || !privateKey) && sa) {
    try {
      const j = JSON.parse(sa) as SA;
      projectId ||= j.project_id;
      clientEmail ||= j.client_email;
      privateKey ||= j.private_key;
    } catch {
      // ignore
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials missing.");
  }

  const storageBucket = resolveBucketName(projectId);
  if (!storageBucket) throw new Error("No storage bucket resolved.");

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

export function getFirestore(app?: App): Firestore {
  return _getFirestore(app ?? getAdminApp());
}

export function getBucketName(): string {
  return resolveBucketName(projectIdFromEnv());
}

export const db: Firestore = getFirestore();
export const bucket = getStorage(getAdminApp()).bucket(getBucketName());

export const adminDb: Firestore = db;
export const adminBucket = bucket;
