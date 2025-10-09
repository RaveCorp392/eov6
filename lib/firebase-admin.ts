import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";
import { getStorage as _getStorage } from "firebase-admin/storage";

function resolveCredential() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    return cert(JSON.parse(serviceAccount));
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = privateKeyRaw.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  return applicationDefault();
}

let app: App;

if (!getApps().length) {
  app = initializeApp({
    credential: resolveCredential(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0]!;
}

const firestore = _getFirestore(app);
const storage = _getStorage(app);

export const db = firestore;
export const bucket = storage.bucket();

export function getFirestore() {
  return db;
}

export function getStorage() {
  return storage;
}

