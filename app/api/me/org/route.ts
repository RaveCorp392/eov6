export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase();

    const db = getFirestore();
    let orgId: string | undefined;

    if (email) {
      const entSnap = await db.collection("entitlements").doc(email).get();
      if (entSnap.exists) {
        orgId = (entSnap.data() as any)?.orgId || undefined;
      }
    }

    if (!orgId && email) {
      const memberQuery = await db
        .collectionGroup("members")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!memberQuery.empty) {
        orgId = memberQuery.docs[0].ref.parent.parent?.id;
      }
    }

    if (!orgId && email) {
      const pendingQuery = await db
        .collection("orgs")
        .where("pendingOwnerEmail", "==", email)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!pendingQuery.empty) {
        orgId = pendingQuery.docs[0].id;
      }
    }

    return NextResponse.json({ ok: true, orgId: orgId || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
