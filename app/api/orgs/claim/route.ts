export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();
    if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

    const db = getFirestore();

    const entRef = db.collection("entitlements").doc(email);
    const entSnap = await entRef.get();
    if (!entSnap.exists) return NextResponse.json({ error: "no_entitlements" }, { status: 404 });

    const ent = entSnap.data() || {};
    const orgId = ent.orgId as string | undefined;
    if (!orgId) return NextResponse.json({ error: "no_org" }, { status: 409 });

    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return NextResponse.json({ error: "org_missing" }, { status: 409 });

    const membersRef = orgRef.collection("members").doc(uid);
    await membersRef.set({ role: "owner", email }, { merge: true });

    await entRef.set({ claimedAt: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
