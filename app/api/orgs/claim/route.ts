export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    // auth
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();
    if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

    // optional override (e.g., {orgId:"meetsafe"})
    let bodyOrgId: string | undefined;
    try {
      const j = await req.json();
      if (j && typeof j.orgId === "string") bodyOrgId = j.orgId;
    } catch {}

    const db = getFirestore();

    // fast path: entitlements already linked
    const entRef = db.collection("entitlements").doc(email);
    const entSnap = await entRef.get();
    let orgId: string | undefined = bodyOrgId || (entSnap.exists ? (entSnap.data() as any).orgId : undefined);

    // fallback: find org where pendingOwnerEmail == email (newest first)
    if (!orgId) {
      const q = await db
        .collection("orgs")
        .where("pendingOwnerEmail", "==", email)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!q.empty) {
        orgId = q.docs[0].id;
        // attach to entitlements for next time
        await entRef.set({ orgId, updatedAt: Date.now() }, { merge: true });
      }
    }

    if (!orgId) return NextResponse.json({ error: "no_org" }, { status: 409 });

    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return NextResponse.json({ error: "org_missing" }, { status: 409 });

    // idempotent promote to owner
    await orgRef.collection("members").doc(uid).set({ role: "owner", email }, { merge: true });
    await entRef.set({ claimedAt: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
