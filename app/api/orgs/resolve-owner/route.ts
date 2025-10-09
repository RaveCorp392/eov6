export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid || "";
    const email = (decoded.email || "").toLowerCase();
    if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });

    const db = adminDb;
    const orgRef = db.collection("orgs").doc(orgId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(orgRef);
      if (!snap.exists) throw new Error("org_not_found");
      const data = snap.data() || {};

      const owner = (data.ownerEmail || "").toLowerCase();
      if (owner) return; // already resolved

      const pending = (data.pendingOwnerEmail || "").toLowerCase();
      if (pending && pending !== email) throw new Error("not_pending_owner");

      const now = Date.now();
      tx.set(orgRef, { ownerEmail: email, pendingOwnerEmail: null, updatedAt: now }, { merge: true });

      if (uid) {
        tx.set(
          orgRef.collection("members").doc(uid),
          { role: "owner", email, updatedAt: now, createdAt: now },
          { merge: true }
        );
      }

      tx.set(
        db.collection("entitlements").doc(email),
        { orgId, claimedAt: now, updatedAt: now },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

