export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

type Req = {
  orgId: string;
  name?: string;
  domains?: string[];
  features?: { allowUploads?: boolean; translateUnlimited?: boolean };
  privacyStatement?: string;
  ack1?: { title?: string; body?: string; required?: boolean };
  ack2?: { title?: string; body?: string; required?: boolean };
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24); // keep first char; cap length only
}

export async function POST(req: NextRequest) {
  try {
    // Auth: require Firebase ID token
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const callerEmail = (decoded.email || "").toLowerCase();
    const callerUid = decoded.uid;

    const body = (await req.json()) as Req;
    if (!body?.orgId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const orgId = slugify(body.orgId);
    const ownerEmail = callerEmail;
    if (!ownerEmail) return NextResponse.json({ error: "owner_email_missing" }, { status: 400 });
    const allowUploads = !!body.features?.allowUploads;
    const translateUnlimited = !!body.features?.translateUnlimited;
    const domains = (body.domains || []).map((d) => d.toLowerCase()).filter(Boolean);
    const now = Date.now();

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);

    const existing = await orgRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: "org_exists" }, { status: 409 });
    }

    await orgRef.set({
      name: body.name || orgId,
      domains,
      features: { allowUploads, translateUnlimited },
      texts: { privacyStatement: body.privacyStatement || "" },
      ownerEmail,
      pendingOwnerEmail: null,
      createdAt: now,
      createdFromPortal: true,
      updatedAt: now,
    });

    // Ack templates (optional)
    if (body.ack1?.title || body.ack1?.body) {
      await orgRef.collection("ackTemplates").doc("slot1").set({
        title: body.ack1.title || "",
        body: body.ack1.body || "",
        required: !!body.ack1.required,
        order: 1,
      }, { merge: true });
    }
    if (body.ack2?.title || body.ack2?.body) {
      await orgRef.collection("ackTemplates").doc("slot2").set({
        title: body.ack2.title || "",
        body: body.ack2.body || "",
        required: !!body.ack2.required,
        order: 2,
      }, { merge: true });
    }

    // Entitlements mapping for owner
    const entRef = db.collection("entitlements").doc(ownerEmail);
    await entRef.set({ orgId, claimedAt: now, updatedAt: now }, { merge: true });

    // If caller IS the owner email, promote immediately (idempotent)
    if (callerUid) {
      await orgRef.collection("members").doc(callerUid).set(
        {
          role: "owner",
          email: ownerEmail,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}


