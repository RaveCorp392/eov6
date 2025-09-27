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
    if (!email.endsWith("@eov6.com")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const b = await req.json();
    const {
      orgId,
      name,
      adminEmail,
      domains = [],
      seats = 5,
      features = {},
      privacyStatement = "",
      ack1 = {},
      ack2 = {}
    } = b || {};
    if (!orgId || !name || !adminEmail) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const db = getFirestore();
    const ref = db.collection("orgs").doc(String(orgId).toLowerCase());
    if ((await ref.get()).exists) return NextResponse.json({ error: "org_exists" }, { status: 409 });

    const now = Date.now();
    await ref.set({
      name,
      domains,
      features,
      texts: { privacyStatement },
      billing: { plan: "team5", cycle: "monthly", seats },
      createdAt: now,
      createdBy: email,
      pendingOwnerEmail: String(adminEmail).toLowerCase()
    });

    if (ack1?.title || ack1?.body)
      await ref
        .collection("ackTemplates")
        .doc("slot1")
        .set({ title: ack1.title || "", body: ack1.body || "", required: !!ack1.required, order: 1 }, { merge: true });
    if (ack2?.title || ack2?.body)
      await ref
        .collection("ackTemplates")
        .doc("slot2")
        .set({ title: ack2.title || "", body: ack2.body || "", required: !!ack2.required, order: 2 }, { merge: true });

    await db
      .collection("entitlements")
      .doc(String(adminEmail).toLowerCase())
      .set({ orgId, updatedAt: now }, { merge: true });

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
