export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "@/lib/firebase-admin";
import { randomCode } from "@/lib/code";

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();
    const uid = decoded.uid || null;

    const body = await req.json().catch(() => ({}));
    const activeOrgId = typeof body?.activeOrgId === "string" && body.activeOrgId.trim() ? body.activeOrgId.trim() : null;

    const db = getFirestore();
    const code = randomCode();
    const now = Date.now();

    await db.collection("sessions").doc(code).set(
      {
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
        closed: false,
        orgId: activeOrgId || null,
        createdByUid: uid,
        createdByEmail: email,
        callerJoinedAt: null,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, code });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
