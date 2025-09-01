// lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";

// (Auth is optional for your flows, but re-exporting keeps parity with older imports)
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
  type Timestamp,
} from "firebase/firestore";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/** Roles used by chat UI */
export type Role = "AGENT" | "CALLER";

/** Message shape used across UI + adapter */
export type ChatMessage = {
  id?: string;                // doc id (optional while mapping)
  text: string;
  sender: Role;
  ts?: number | Timestamp;    // unix ms or Firestore Timestamp
};

// ---- App init ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Singletons
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// ---- Chat API ---------------------------------------------------------------
/** Subscribe to messages ordered by timestamp; returns an unsubscribe */
export function getMessages(
  sessionId: string,
  cb: (msgs: ChatMessage[]) => void
) {
  const q = query(
    collection(db, "sessions", sessionId, "messages"),
    orderBy("ts", "asc")
  );
  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs.map((d) => {
      const data = d.data() as any;
      const rawSender = (data?.sender ?? "CALLER") as Role;
      const sender: Role = rawSender === "AGENT" ? "AGENT" : "CALLER";
      return {
        id: d.id,
        text: String(data?.text ?? ""),
        sender,
        ts: (data?.ts as any) ?? undefined,
      };
    });
    cb(msgs);
  });
}

/** Add a message; backend sets canonical timestamp if not provided */
export async function sendMessage(
  sessionId: string,
  m: Omit<ChatMessage, "id">
): Promise<void> {
  const col = collection(db, "sessions", sessionId, "messages");
  await addDoc(col, {
    text: m.text,
    sender: m.sender,
    ts: m.ts ?? serverTimestamp(),
  });
}

// ---- Caller details API -----------------------------------------------------
export async function saveCallerDetails(
  sessionId: string,
  details: { name?: string; email?: string; phone?: string }
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "details");
  await setDoc(
    ref,
    { ...details, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function fetchCallerDetails(sessionId: string): Promise<any> {
  const ref = doc(db, "sessions", sessionId, "details");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

// ---- Uploads API ------------------------------------------------------------
export async function uploadToStorage(
  sessionId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const path = `sessions/${sessionId}/uploads/${Date.now()}-${file.name}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return { url, path };
}

// ---- Aliases to match UI imports (stops “has no exported member” TS errors) -
export const postDetails = saveCallerDetails;
export const getCallerDetails = fetchCallerDetails;
export const uploadFile = uploadToStorage;

// ---- Re-exports (keep parity with prior file) -------------------------------
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
export type { Timestamp, User };
