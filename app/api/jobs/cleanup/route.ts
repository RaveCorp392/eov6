export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore, getStorage } from "@/lib/firebase-admin";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  if (CRON_SECRET) {
    if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
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
