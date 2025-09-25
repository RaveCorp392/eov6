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

    const { orgId, newOwnerEmail } = (await req.json()) as {
      orgId: string;
      newOwnerEmail: string;
    };
    if (!orgId || !newOwnerEmail) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const me = await orgRef.collection("members").doc(uid).get();
    if (!me.exists || me.data()?.role !== "owner") {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }

    await orgRef.set(
      {
        pendingOwnerEmail: (newOwnerEmail as string).toLowerCase(),
        pendingOwnerRequestedAt: Date.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
