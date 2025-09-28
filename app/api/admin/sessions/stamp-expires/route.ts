export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "@/lib/firebase-admin";

/**
 * POST { hoursAgo?: number, limit?: number }
 * Sets expiresAt = now on sessions whose createdAt <= now - hoursAgo (default 24h)
 */
export async function POST(req: NextRequest) {
  try {
    const db = getFirestore();
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
    const hoursAgo = Math.max(1, Number(body?.hoursAgo || 24));
    const pageLimit = Math.min(500, Math.max(1, Number(body?.limit || 200)));

    const cutoff = new Date(Date.now() - hoursAgo * 3600 * 1000);
    const snap = await db
      .collection("sessions")
      .where("expiresAt", "==", null)
      .limit(pageLimit)
      .get();

    let stamped = 0;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const createdAt =
        data.createdAt instanceof Date
          ? data.createdAt
          : typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate()
          : null;
      if (createdAt && createdAt <= cutoff) {
        await doc.ref.set({ expiresAt: new Date() }, { merge: true });
        stamped++;
      }
    }

    return NextResponse.json({ ok: true, stamped, cutoff: cutoff.toISOString(), batch: snap.size });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
