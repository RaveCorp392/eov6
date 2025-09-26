export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = (await req.json()) as { orgId: string };
    if (!orgId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();
    const allowList = (process.env.INTERNAL_ALLOWLIST || "")
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isInternal = email.endsWith("@eov6.com") || allowList.includes(email);

    if (!isInternal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return NextResponse.json({ error: "org_missing" }, { status: 404 });

    const subs = await orgRef.listCollections();
    for (const sub of subs) {
      const s = await sub.get();
      const batch = db.batch();
      s.docs.forEach((d) => batch.delete(d.ref));
      if (s.size) await batch.commit();
    }

    await orgRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
