import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";
import { getStorage as _getStorage } from "firebase-admin/storage";

function fromTriplet() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey?.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }
  return null;
}

const credential =
  (process.env.FIREBASE_SERVICE_ACCOUNT && cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))) ||
  fromTriplet() ||
  applicationDefault();

const app = getApps()[0] ?? initializeApp({
  credential,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export function getFirestore() { return _getFirestore(app); }
export function getStorage() { return _getStorage(app); }
