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
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);

    const { orgId, features, texts, ack } = (await req.json()) as any;
    if (!orgId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);

    // require caller to be member/owner OR internal
    const me = await orgRef.collection("members").doc(decoded.uid).get();
    const isInternal = (decoded.email || "").toLowerCase().endsWith("@eov6.com");
    if (!me.exists && !isInternal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    await orgRef.set(
      {
        ...(features
          ? { features: { allowUploads: !!features.allowUploads, translateUnlimited: !!features.translateUnlimited } }
          : {}),
        ...(texts ? { texts: { privacyStatement: texts.privacyStatement || "" } } : {}),
        updatedAt: Date.now()
      },
      { merge: true }
    );

    if (Array.isArray(ack)) {
      const batch = db.batch();
      ack.forEach((a: any) => {
        const id = a.id || `slot${a.order || 1}`;
        batch.set(
          orgRef.collection("ackTemplates").doc(id),
          {
            title: a.title || "",
            body: a.body || "",
            required: !!a.required,
            order: a.order || 1
          },
          { merge: true }
        );
      });
      await batch.commit();
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
