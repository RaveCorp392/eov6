import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore as _getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let _app: App | undefined;
let _projectId: string | undefined;

function resolveBucketName(projectId: string): string {
  const fromEnv = (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    ""
  ).trim();
  if (fromEnv) return fromEnv;
  return `${projectId}.firebasestorage.app`;
}

function resolveProjectCredentials(): { projectId: string; clientEmail: string; privateKey: string } {
  let projectId = process.env.FIREBASE_PROJECT_ID || "";
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if ((!projectId || !clientEmail || !privateKey) && sa) {
    try {
      const parsed = JSON.parse(sa) as ServiceAccount;
      projectId ||= parsed.project_id;
      clientEmail ||= parsed.client_email;
      privateKey ||= parsed.private_key;
    } catch {
      // ignore
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials missing.");
  }

  return { projectId, clientEmail, privateKey };
}

function getKnownProjectId(): string {
  if (_projectId) return _projectId;
  const raw = process.env.FIREBASE_PROJECT_ID || "";
  if (raw) return raw;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    try {
      const parsed = JSON.parse(sa) as ServiceAccount;
      if (parsed.project_id) return parsed.project_id;
    } catch {
      // ignore
    }
  }
  return "unknown-project";
}

/** Lazy, idempotent Admin init. Safe at build & runtime. */
export function getAdminApp(): App {
  if (_app) return _app;

  const { projectId, clientEmail, privateKey } = resolveProjectCredentials();
  _projectId = projectId;
  const storageBucket = resolveBucketName(projectId);

  if (!getApps().length) {
    _app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), storageBucket });
  } else {
    _app = getApps()[0]!;
  }
  return _app!;
}

/** Wrapper so callers can still do getFirestore(getAdminApp()). */
export function getFirestore(app?: App): Firestore {
  return _getFirestore(app ?? getAdminApp());
}

function currentBucketName(): string {
  const projectId = _projectId || getKnownProjectId();
  return resolveBucketName(projectId);
}

/** Ready-to-use handles */
export const db: Firestore = getFirestore();
export const bucket = getStorage(getAdminApp()).bucket(currentBucketName());

export function getBucketName(): string {
  return currentBucketName();
}

/** Back-compat aliases used around the codebase */
export const adminDb: Firestore = db;
export const adminBucket = bucket;
