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
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

/* =========
   Config
   ========= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAxK8Uh1l78LyOepNLneV9xyjFNfrRsGz4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eov6-4e929.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eov6-4e929",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eov6-4e929.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "926090330101",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:926090330101:web:26a2f5f5d67defcd5b2abc",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

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
  type: "text" | "system" | "file";
  text?: string;
  url?: string;
  createdAt: any;
  createdAtMs?: number;
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

/* =========
   Chat helpers
   ========= */
export function getMessages(sessionId: string, onData: (messages: ChatMessage[]) => void): Unsubscribe {
  const qy = query(collection(db, "sessions", sessionId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(qy, (snap) => {
    const rows: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onData(rows);
  });
}

export function watchMessages(sessionId: string, onData: (messages: ChatMessage[]) => void): Unsubscribe {
  const qy = query(collection(db, "sessions", sessionId, "messages"), orderBy("createdAtMs", "asc"));
  return onSnapshot(qy, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

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

export async function uploadFileToSession(code: string, file: File): Promise<string> {
  const r = ref(storage, `sessions/${code}/${Date.now()}_${file.name}`);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

// --- Translate session config & preview count ---
export async function setTranslateConfig(
  code: string,
  cfg: Partial<{ enabled: boolean; agentLang: string; callerLang: string; requested?: boolean; previewCount?: number }>
) {
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const payload: any = {
    translate: {
      enabled: !!cfg.enabled,
      agentLang: norm(cfg.agentLang),
      callerLang: norm(cfg.callerLang),
      requested: cfg.requested ?? false,
      previewCount: cfg.previewCount ?? undefined,
    },
    updatedAt: serverTimestamp(),
  };
  await _setDoc(doc(db, "sessions", code), payload, { merge: true });
}

export async function bumpTranslatePreviewCount(code: string) {
  await _updateDoc(doc(db, "sessions", code), { translatePreviewCount: _increment(1) });
}
