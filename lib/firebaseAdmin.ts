// Back-compat re-exports to satisfy imports like "@/lib/firebaseAdmin"
export * from "./firebase-admin";
export { db as adminDb, bucket as adminBucket, getAdminApp } from "./firebase-admin";