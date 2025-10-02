export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid || "";
    const email = (decoded.email || "").toLowerCase();
    if (!uid || !email) return NextResponse.json({ error: "no_email" }, { status: 400 });

    const payload = await req.json().catch(() => null) as any;
    const orgId = typeof payload?.orgId === "string" ? payload.orgId.trim() : "";
    if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

    const data = orgSnap.data() || {};
    const owner = (data.ownerEmail || "").toLowerCase();
    const pendingOwner = (data.pendingOwnerEmail || "").toLowerCase();
    const now = Date.now();

    const memRef = orgRef.collection("members").doc(uid);
    const memSnap = await memRef.get();

    if (memSnap.exists) {
      await db.collection("entitlements").doc(email).set(
        { orgId, updatedAt: now },
        { merge: true }
      );
      return NextResponse.json({ ok: true, orgId });
    }

    if (!owner || pendingOwner === email) {
      await orgRef.set(
        { ownerEmail: email, pendingOwnerEmail: null, updatedAt: now },
        { merge: true }
      );
      await memRef.set(
        { role: "owner", email, createdAt: now, updatedAt: now },
        { merge: true }
      );
    } else {
      const inviteSnap = await orgRef
        .collection("invites")
        .where("email", "==", email)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (inviteSnap.empty) {
        return NextResponse.json({ error: "no_pending_invite" }, { status: 403 });
      }

      const inviteRef = inviteSnap.docs[0].ref;
      await memRef.set(
        { role: "viewer", email, createdAt: now, updatedAt: now },
        { merge: true }
      );
      await inviteRef.set(
        { status: "accepted", acceptedAt: now },
        { merge: true }
      );
    }

    await db.collection("entitlements").doc(email).set(
      { orgId, claimedAt: now, updatedAt: now },
      { merge: true }
    );

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
