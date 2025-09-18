// tools/migrate-admins-to-members.ts
// One-off script to migrate org.admins[] emails to orgs/{id}/members/* records.
// Usage: FIREBASE_SERVICE_ACCOUNT_KEY='{"project_id":...}' node tools/migrate-admins-to-members.ts

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadSa() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  try { return JSON.parse(raw); } catch { return JSON.parse(Buffer.from(raw, "base64").toString("utf8")); }
}

async function run() {
  initializeApp({ credential: cert(loadSa()) });
  const db = getFirestore();
  const orgs = await db.collection("orgs").get();
  for (const org of orgs.docs) {
    const data = org.data() || {};
    const admins: string[] = Array.isArray(data.admins) ? data.admins.map((e: any)=>String(e||"").toLowerCase()).filter(Boolean) : [];
    if (!admins.length) continue;
    console.log(`Org ${org.id}: migrating ${admins.length} admin emails…`);
    for (const email of admins) {
      await org.ref.collection("members").add({ role: "admin", email, createdAt: new Date(), needsUidResolution: true });
    }
  }
  console.log("Done.");
}

run().catch((e)=>{ console.error(e); process.exit(1); });

