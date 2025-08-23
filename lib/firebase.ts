import {initializeApp,getApps} from 'firebase/app';import {getFirestore} from 'firebase/firestore';
const cfg={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};
export function isFirebaseReady(){return Boolean(cfg.apiKey&&cfg.projectId&&cfg.appId)}
const app=!getApps().length?initializeApp(cfg):getApps()[0];export const db=getFirestore(app);
