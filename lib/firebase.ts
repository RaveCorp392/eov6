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
import { getStorage } from 'firebase/storage'; // ⟵ NEW

/* =========
   Config
   ========= */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAxK8Uh1l78LyOepNLneV9xyjFNfrRsGz4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'eov6-4e929.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'eov6-4e929',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'eov6-4e929.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '926090330101',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:926090330101:web:26a2f5f5d67defcd5b2abc',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // ⟵ NEW

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
  type: 'text' | 'system';
  text: string;
  createdAt: any;
  [k: string]: any;
};

/* =========
   Chat helpers
   ========= */
export function getMessages(
  sessionId: string,
  onData: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'sessions', sessionId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const rows: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onData(rows);
  });
}

type LegacyMsgPayload = { text: string; sender?: Role; role?: Role; ts?: number; [k: string]: any };

export async function sendMessage(sessionId: string, role: Role, text: string): Promise<void>;
export async function sendMessage(sessionId: string, payload: LegacyMsgPayload): Promise<void>;
export async function sendMessage(sessionId: string, arg2: any, arg3?: any) {
  let text: string;
  let role: Role;
  let extra: Record<string, any> = {};

  if (typeof arg2 === 'string') {
    role = arg2 as Role;
    text = String(arg3 ?? '');
  } else {
    const p = arg2 as LegacyMsgPayload;
    text = p.text ?? '';
    role = (p.sender || p.role || 'caller') as Role;
    extra = { ...p };
    delete extra.text;
    delete (extra as any).sender;
    delete (extra as any).role;
    if (p.ts) extra.clientTs = p.ts;
  }

  if (!text.trim()) return;

  await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
    role,
    type: 'text',
    text,
    createdAt: serverTimestamp(),
    ...extra,
  } as ChatMessage);
}

export async function getCallerDetails(sessionId: string): Promise<Record<string, any>> {
  const try1 = await getDoc(doc(db, 'sessions', sessionId, 'details', 'caller'));
  if (try1.exists()) return try1.data() as any;

  const try2 = await getDoc(doc(db, 'sessions', sessionId, 'details'));
  if (try2.exists()) return try2.data() as any;

  return {};
}
