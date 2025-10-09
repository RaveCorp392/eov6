// lib/firebase.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  doc,
  type Unsubscribe,
  setDoc as _setDoc,
  updateDoc as _updateDoc,
  deleteField as _deleteField,
  increment as _increment,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User,
  type Auth,
} from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL, getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const isClient = typeof window !== "undefined";
const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const appInstance = isClient && hasFirebaseConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : undefined;

const noop = () => {
  throw new Error("Firebase client not initialized. Check NEXT_PUBLIC_FIREBASE_* env vars.");
};

const stubFirestore = new Proxy({}, { get: () => noop }) as Firestore;
const stubAuth = new Proxy(
  { currentUser: null },
  {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return noop;
    },
  }
) as Auth;
const stubStorage = new Proxy({}, { get: () => noop }) as FirebaseStorage;

export const app: FirebaseApp = (appInstance || ({} as FirebaseApp));
export const db: Firestore = appInstance ? getFirestore(appInstance) : stubFirestore;
export const auth: Auth = appInstance ? getAuth(appInstance) : stubAuth;
export const storage: FirebaseStorage = appInstance ? getStorage(appInstance) : stubStorage;
export default app;

if (appInstance) {
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn("[auth:persistence] failed", e);
  });

  auth.useDeviceLanguage?.();

  if (typeof window !== "undefined") {
    console.log("[auth:init]", {
      origin: window.location.origin,
      authDomain: (auth.config as any)?.authDomain,
    });
  }
}

export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, signInWithPopup, signOut };
export type { User };

/* =========
   Types
   ========= */
export type Role = "caller" | "agent" | "system";

export type ChatMessage = {
  id?: string;
  role: Role;
  type: "text" | "system" | "file" | "ack";
  text?: string;
  url?: string;
  createdAt?: any;
  createdAtMs?: number;
  ack?: { id?: string; title?: string; status?: "accepted" | "declined" };
  [k: string]: any;
};

export type AckRequest = { at?: number; requireName?: boolean; text?: string };
export type SessionDoc = { id?: string; ackRequest?: AckRequest | null; [k: string]: any };

/* =========
   Utilities
   ========= */
export function targetLangFor(role: Role, t?: { agentLang?: string; callerLang?: string }) {
  const src = role === "agent" ? (t?.agentLang || "en") : (t?.callerLang || "en");
  const tgt = role === "agent" ? (t?.callerLang || "en") : (t?.agentLang || "en");
  return { src: src.toLowerCase(), tgt: tgt.toLowerCase() };
}

// Lightweight language list for selects
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fa', label: 'Farsi (Persian)' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
];

export const normLang2 = (v?: string) =>
  String(v || '').slice(0, 2).toLowerCase() || 'en';

/* =========
   Chat helpers
   ========= */

export function watchSession(code: string, onData: (session: SessionDoc | null) => void): Unsubscribe {
  const r = doc(db, "sessions", code);
  return onSnapshot(r, (snap) => onData(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null));
}

type LegacyMsgPayload = {
  text?: string;
  sender?: Role;
  role?: Role;
  ts?: number;
  url?: string;
  type?: "text" | "system" | "file";
  [k: string]: any;
};

export async function sendMessage(sessionId: string, role: Role, text: string): Promise<void>;
export async function sendMessage(sessionId: string, payload: LegacyMsgPayload): Promise<void>;
export async function sendMessage(sessionId: string, arg2: any, arg3?: any) {
  const strip = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

  let role: Role;
  let text: string | undefined;
  let url: string | undefined;
  let explicitType: "text" | "system" | "file" | undefined;
  let extra: Record<string, any> = {};

  if (typeof arg2 === "string") {
    role = arg2 as Role;
    text = typeof arg3 === "string" ? arg3 : String(arg3 ?? "");
  } else {
    const p = arg2 as LegacyMsgPayload;
    text = p.text;
    url = p.url;
    explicitType = p.type;
    role = (p.sender || p.role || "caller") as Role;
    extra = { ...p };
    delete extra.text; delete (extra as any).sender; delete (extra as any).role; delete extra.url; delete extra.type;
    if (p.ts) extra.clientTs = p.ts;
  }

  const type: "text" | "system" | "file" = explicitType === "system" ? "system" : url ? "file" : "text";
  if (type !== "file") {
    const t = (text ?? "").trim();
    if (!t) return;
    text = t;
  }

  const payload = strip({ role, type, text, url, createdAt: serverTimestamp(), createdAtMs: Date.now(), ...extra });
  await addDoc(collection(db, "sessions", sessionId, "messages"), payload as any);
}

export async function getCallerDetails(sessionId: string): Promise<Record<string, any>> {
  const try1 = await getDoc(doc(db, "sessions", sessionId, "details", "caller"));
  if (try1.exists()) return try1.data() as any;
  const try2 = await getDoc(doc(db, "sessions", sessionId, "details"));
  if (try2.exists()) return try2.data() as any;
  return {};
}

export function watchDetails(code: string, onData: (d: any) => void): Unsubscribe {
  const dref = doc(db, "sessions", code, "details", "caller");
  return onSnapshot(dref, (snap) => onData(snap.exists() ? (snap.data() as any) : {}));
}

export async function saveDetails(code: string, partial: { name?: string; email?: string; phone?: string; notes?: string }) {
  const dref = doc(db, "sessions", code, "details", "caller");
  await _setDoc(dref, { ...partial, updatedAt: serverTimestamp() }, { merge: true });
}

export async function requestAck(code: string, requireName = true) {
  await _updateDoc(doc(db, "sessions", code), { ackRequest: { requireName: !!requireName, at: serverTimestamp() } });
}

export async function clearAck(code: string) {
  await _updateDoc(doc(db, "sessions", code), { ackRequest: _deleteField() });
}

export async function uploadFileToSession(
  code: string,
  file: File | Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  const originalName = (file as File).name ? (file as File).name.replace(/\s+/g, "_") : `blob_${Date.now()}`;
  const path = `uploads/${code}/${Date.now()}_${originalName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return await new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// --- Translate session config & preview count ---
export async function setTranslateConfig(
  code: string,
  cfg: { enabled?: boolean; agentLang?: string; callerLang?: string; requested?: boolean; previewCount?: number }
) {
  const t: any = {};
  if (cfg.enabled !== undefined) t.enabled = !!cfg.enabled;
  if (cfg.agentLang !== undefined) t.agentLang = String(cfg.agentLang || '').toLowerCase();
  if (cfg.callerLang !== undefined) t.callerLang = String(cfg.callerLang || '').toLowerCase();
  if (cfg.requested !== undefined) t.requested = !!cfg.requested;
  if (typeof cfg.previewCount === 'number') t.previewCount = cfg.previewCount;
  await _setDoc(
    doc(db, 'sessions', code),
    { translate: t, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
export async function bumpTranslatePreviewCount(code: string) {
  await _updateDoc(doc(db, "sessions", code), { translatePreviewCount: _increment(1) });
}
