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
    const decoded = await getAuth().verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();

    const { orgId, emails } = (await req.json()) as { orgId: string; emails: string[] };
    if (!orgId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    // soft guard: require caller to be member/owner OR internal (optional)
    const me = await orgRef.collection("members").doc(decoded.uid).get();
    const isInternal = email.endsWith("@eov6.com");
    if (!me.exists && !isInternal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const batch = db.batch();
    (emails || []).forEach((e) => {
      const le = (e || "").toLowerCase();
      if (!le) return;
      const ref = orgRef.collection("invites").doc(le.replace(/[^a-z0-9._-]/g, "_"));
      batch.set(ref, { email: le, status: "pending", createdAt: Date.now() }, { merge: true });
    });
    await batch.commit();

    return NextResponse.json({ ok: true, count: (emails || []).length });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
