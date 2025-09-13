// lib/firebase.ts
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  doc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* =========
   Config
   ========= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAxK8Uh1l78LyOepNLneV9xyjFNfrRsGz4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'eov6-4e929.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'eov6-4e929',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'eov6-4e929.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '926090330101',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:926090330101:web:26a2f5f5d67defcd5b2abc',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* =========
   Exports
   ========= */
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, signInWithPopup, signOut };
export type { User };

/* =========
   Types
   ========= */
export type Role = 'caller' | 'agent' | 'system';

export type ChatMessage = {
  id?: string;
  role: Role;
  type: 'text' | 'system' | 'file';
  text?: string;
  url?: string;               // for file messages
  createdAt: any;             // Firestore server timestamp
  createdAtMs: number;        // client ms (stable ordering immediately)
  [k: string]: any;
};

/* =========
   Utils
   ========= */
function stripUndef<T extends Record<string, any>>(o: T): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(o)) {
    const v = (o as any)[k];
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/* =========
   Session + Details watchers
   ========= */
export function watchSession<T = any>(code: string, onData: (data: T | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'sessions', code), (snap) => onData(snap.exists() ? (snap.data() as T) : null));
}

export function watchMessages(code: string, onData: (messages: ChatMessage[]) => void): Unsubscribe {
  // Order by client ms first, then server ts for deterministic order
  const qy = query(
    collection(db, 'sessions', code, 'messages'),
    orderBy('createdAtMs', 'asc'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(qy, (snap) => {
    const rows: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onData(rows);
  });
}

export async function getCallerDetails(code: string): Promise<Record<string, any>> {
  const v1 = await getDoc(doc(db, 'sessions', code, 'details', 'caller'));
  if (v1.exists()) return v1.data() as any;
  const v0 = await getDoc(doc(db, 'sessions', code, 'details'));
  if (v0.exists()) return v0.data() as any;
  return {};
}

export function watchDetails(
  code: string,
  onData: (data: Record<string, any>) => void
): Unsubscribe {
  // prefer new path; if you still have legacy, you can swap to a two-listener strategy
  const detailsRef = doc(db, 'sessions', code, 'details', 'caller');
  return onSnapshot(detailsRef, (snap) => onData(snap.exists() ? (snap.data() as any) : {}));
}

export async function saveDetails(
  code: string,
  patch: Partial<{ name: string; email: string; phone: string; notes: string }>
) {
  const detailsRef = doc(db, 'sessions', code, 'details', 'caller');
  await setDoc(detailsRef, stripUndef({ ...patch, updatedAt: serverTimestamp() }), { merge: true });
}

/* =========
   Acknowledgements
   ========= */
export async function requestAck(code: string, requireName = true) {
  await updateDoc(doc(db, 'sessions', code), {
    ackRequest: stripUndef({
      at: serverTimestamp(),
      requireName: !!requireName,
    }),
  });
}

export async function clearAck(code: string) {
  await updateDoc(doc(db, 'sessions', code), { ackRequest: deleteField() });
}

/* =========
   File upload (caller side)
   ========= */
export async function uploadFileToSession(code: string, file: File): Promise<string> {
  const path = `sessions/${code}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  return url;
}

/* =========
   Send message (safe)
   ========= */
type LegacyMsgPayload = {
  text?: string;
  url?: string;
  type?: 'text' | 'system' | 'file';
  sender?: Role;
  role?: Role;
  ts?: number;                // optional client ms from caller
  [k: string]: any;
};

// Overloads
export async function sendMessage(code: string, role: Role, text: string): Promise<void>;
export async function sendMessage(code: string, payload: LegacyMsgPayload): Promise<void>;

export async function sendMessage(code: string, arg2: any, arg3?: any) {
  let role: Role;
  let text: string | undefined;
  let url: string | undefined;
  let explicitType: 'text' | 'system' | 'file' | undefined;
  let extra: Record<string, any> = {};

  if (typeof arg2 === 'string') {
    // (code, role, text)
    role = arg2 as Role;
    text = typeof arg3 === 'string' ? arg3 : String(arg3 ?? '');
  } else {
    // (code, payload)
    const p = arg2 as LegacyMsgPayload;
    text = p.text;
    url = p.url;
    explicitType = p.type;
    role = (p.sender || p.role || 'caller') as Role;
    extra = { ...p };
    delete extra.text;
    delete (extra as any).sender;
    delete (extra as any).role;
    delete extra.url;
    delete extra.type;
    if (p.ts) extra.clientTs = p.ts;
  }

  // Derive type
  const type: 'text' | 'system' | 'file' =
    explicitType === 'system'
      ? 'system'
      : url
      ? 'file'
      : 'text';

  // Trim text for text/system; allow empty for 'file'
  if (type !== 'file') {
    const t = (text ?? '').trim();
    if (!t) return;
    text = t;
  }

  const nowMs = Date.now();
  const docBody = stripUndef({
    role,
    type,
    text,
    url,
    createdAt: serverTimestamp(),
    createdAtMs: nowMs,
    ...extra,
  }) as ChatMessage;

  await addDoc(collection(db, 'sessions', code, 'messages'), docBody);
}
