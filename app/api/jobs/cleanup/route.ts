export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore, getStorage } from "@/lib/firebase-admin";

// Keep a secret for manual calls, but allow the Vercel scheduler through.
const AUTH = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  // Vercel sets this header on scheduled invocations:
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  // If a secret is configured, require it for manual calls.
  // Scheduled jobs (x-vercel-cron=1) bypass the secret.
  if (AUTH && !isVercelCron && req.headers.get("x-cron-secret") !== AUTH) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getFirestore();
  const storage = getStorage();

  const snap = await db
    .collection("sessions")
    .where("expiresAt", "<=", new Date())
    .limit(50)
    .get();

  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      const subSnap = await sub.get();
      const batch = db.batch();
      subSnap.docs.forEach((d) => batch.delete(d.ref));
      if (subSnap.size) await batch.commit();
    }

    try {
      await storage.bucket().deleteFiles({ prefix: `uploads/${doc.id}/` });
    } catch {}

    await doc.ref.delete();
  }

  return NextResponse.json({ purged: snap.size }, { status: 200 });
}
