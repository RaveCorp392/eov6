export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return bad("no_token", 401);
    const decoded = await getAuth().verifyIdToken(idToken);

    const uid = decoded.uid || "";
    const email = (decoded.email || "").toLowerCase().trim();
    if (!uid || !email) return bad("no_user_email", 401);

    const { orgId } = (await req.json()) as { orgId?: string };
    if (!orgId) return bad("missing_orgId");

    const db = adminDb;
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return bad("org_not_found", 404);

    // must be entitled to join (owner/admin can already add; this heals self)
    const ent = await db.collection("entitlements").doc(email).get();
    const mapped = ent.exists ? ((ent.data() as any)?.orgId || null) : null;
    if (mapped !== orgId) return bad("not_entitled", 403);

    const memRef = orgRef.collection("members").doc(uid);
    const memSnap = await memRef.get();
    const now = Date.now();
    if (!memSnap.exists) {
      await memRef.set({ role: "viewer", email, createdAt: now, updatedAt: now }, { merge: true });
      console.log("[api/orgs/join]", { orgId, email, path: "join", status: "created" });
    } else {
      await memRef.set({ updatedAt: now }, { merge: true });
      console.log("[api/orgs/join]", { orgId, email, path: "join", status: "refreshed" });
    }
    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return bad(String(e?.message || e));
  }
}
