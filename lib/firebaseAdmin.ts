// Shim so imports like "@/lib/firebaseAdmin" keep working.
export * from "./firebase-admin";
export { db as adminDb, bucket as adminBucket, getAdminApp } from "./firebase-admin";