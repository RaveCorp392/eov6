// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/** App init (ENV names match your .env) */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Singletons */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

/** Types */
export type ChatRole = "AGENT" | "CALLER";
export type ChatMessage = {
  id?: string;
  role: ChatRole;
  text: string;
  createdAt: any; // Firestore Timestamp | serverTimestamp placeholder
};
export type CallerDetails = {
  name?: string;
  email?: string;
  phone?: string;
  uploadedUrl?: string;
};

/** Collections helpers */
const sessionRef = (sessionId: string) => doc(db, "sessions", sessionId);
const messagesCol = (sessionId: string) =>
  collection(db, "sessions", sessionId, "messages");
const detailsDoc = (sessionId: string) =>
  doc(db, "sessions", sessionId, "meta", "caller");

/** === Chat === */

/** sendMessage: used by UI (Enter=send, Shift+Enter=newline) */
export async function sendMessage(
  sessionId: string,
  role: ChatRole,
  text: string
) {
  const trimmed = text.replace(/\r/g, "");
  if (!trimmed) return;
  await addDoc(messagesCol(sessionId), {
    role,
    text: trimmed,
    createdAt: serverTimestamp(),
  } as ChatMessage);
}

/** getMessages: realtime listener used by UI */
export function getMessages(
  sessionId: string,
  onChange: (msgs: ChatMessage[]) => void
) {
  const q = query(messagesCol(sessionId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const out: ChatMessage[] = [];
    snap.forEach((d) => {
      const data = d.data() as DocumentData;
      out.push({
        id: d.id,
        role: (data.role as ChatRole) ?? "CALLER",
        text: (data.text as string) ?? "",
        createdAt: data.createdAt ?? null,
      });
    });
    onChange(out);
  });
}

/** Ensure session doc exists (cheap upsert) */
export async function ensureSession(sessionId: string) {
  await setDoc(
    sessionRef(sessionId),
    { createdAt: serverTimestamp() },
    { merge: true }
  );
}

/** === Details === */

/** postDetails: caller submits (name/email/phone) */
export async function postDetails(sessionId: string, details: CallerDetails) {
  await setDoc(
    detailsDoc(sessionId),
    { ...details, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** getCallerDetails: agent reads */
export async function getCallerDetails(
  sessionId: string
): Promise<CallerDetails | null> {
  const snap = await getDoc(detailsDoc(sessionId));
  return snap.exists() ? (snap.data() as CallerDetails) : null;
}

/** === Uploads (images/PDF only) === */

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** uploadFile: returns public URL (store it into details if you like) */
export async function uploadFile(
  sessionId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Only images (png/jpg/webp/gif) and PDF are allowed.");
  }
  const key = `sessions/${sessionId}/${Date.now()}_${file.name}`;
  const ref = storageRef(storage, key);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return url;
}

/** Re-exports used across the app (OK with isolatedModules) */
export {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  storageRef,
  uploadBytes,
  getDownloadURL,
};
export type { User };
