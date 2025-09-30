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
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();
    if (!uid || !email) return NextResponse.json({ error: "no_email" }, { status: 400 });

    let payload: any = null;
    try {
      payload = await req.json();
    } catch {}
    const orgId = typeof payload?.orgId === "string" ? payload.orgId.trim() : "";
    if (!orgId) {
      return NextResponse.json({ error: "missing_orgId" }, { status: 400 });
    }

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return NextResponse.json({ error: "org_not_found" }, { status: 404 });
    }

    const memberRef = orgRef.collection("members").doc(uid);
    const memberSnap = await memberRef.get();
    if (memberSnap.exists) {
      await memberRef.set({ email, updatedAt: Date.now() }, { merge: true });
    } else {
      await memberRef.set(
        {
          role: "owner",
          email,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await db.collection("entitlements").doc(email).set(
      {
        orgId,
        claimedAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
