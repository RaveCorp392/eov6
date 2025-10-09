export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

/**
 * POST { mode: "all" | "expired" | "olderThanHours", hours?: number, limit?: number }
 * - all: delete *all* sessions (careful)
 * - expired: delete sessions with expiresAt <= now
 * - olderThanHours: delete sessions with createdAt older than N hours (default 24)
 */
export async function POST(req: NextRequest) {
  try {
    const db = adminDb;
    const storage = getStorage();

    const cronSecret = process.env.CRON_SECRET || "";
    const incomingSecret = req.headers.get("x-cron-secret") || "";
    const isCron = !!incomingSecret && incomingSecret === cronSecret;
    let isStaff = false;

    if (!isCron) {
      const hdr = req.headers.get("authorization") || "";
      const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
      if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      const decoded = await getAuth().verifyIdToken(idToken);
      const email = (decoded.email || "").toLowerCase();
      isStaff = email.endsWith("@eov6.com");
      if (!isStaff) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = (body?.mode as string) || "expired";
    const hours = Math.max(1, Number(body?.hours || 24));
    const pageLimit = Math.min(500, Math.max(1, Number(body?.limit || 200)));

    const now = Date.now();
    let q = db.collection("sessions").limit(pageLimit);

    if (mode === "expired") {
      q = db.collection("sessions").where("expiresAt", "<=", new Date(now)).limit(pageLimit);
    } else if (mode === "olderThanHours") {
      const cutoff = new Date(now - hours * 60 * 60 * 1000);
      q = db.collection("sessions").where("createdAt", "<=", cutoff).limit(pageLimit);
    } else if (mode !== "all") {
      return NextResponse.json({ error: "bad_mode" }, { status: 400 });
    }

    const snap = await q.get();
    let purged = 0;

    for (const doc of snap.docs) {
      const code = doc.id;

      const subs = await doc.ref.listCollections();
      for (const sub of subs) {
        const s = await sub.get();
        if (!s.size) continue;
        const batch = db.batch();
        s.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      try {
        await storage.bucket().deleteFiles({ prefix: `uploads/${code}/` });
      } catch {}

      await doc.ref.delete();
      purged++;
    }

    return NextResponse.json({ ok: true, purged, mode, batch: snap.size });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
