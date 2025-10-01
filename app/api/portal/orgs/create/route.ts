export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

type CreateOrgPayload = {
  orgId: string;
  name?: string;
  features?: Record<string, any>;
  texts?: Record<string, any>;
  domains?: string[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid || "";
    const creatorEmail = (decoded.email || "").toLowerCase();
    if (!creatorEmail) return NextResponse.json({ error: "creator_email_missing" }, { status: 400 });

    const body = (await req.json()) as CreateOrgPayload;
    if (!body?.orgId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const orgId = slugify(body.orgId);
    if (!orgId) return NextResponse.json({ error: "invalid_org_id" }, { status: 400 });

    const db = getFirestore();
    const ref = db.collection("orgs").doc(orgId);
    const existing = await ref.get();
    if (existing.exists) return NextResponse.json({ error: "org_exists" }, { status: 409 });

    const now = Date.now();
    await ref.set(
      {
        name: body.name || orgId,
        ownerEmail: creatorEmail,
        pendingOwnerEmail: null,
        domains: Array.isArray(body.domains) ? body.domains.map((d) => d.toLowerCase()).filter(Boolean) : [],
        features: body.features || {},
        texts: body.texts || { privacyStatement: "" },
        createdFromPortal: true,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    if (uid) {
      await ref.collection("members").doc(uid).set(
        {
          role: "owner",
          email: creatorEmail,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await db.collection("entitlements").doc(creatorEmail).set(
      { orgId, claimedAt: now, updatedAt: now },
      { merge: true }
    );

    return NextResponse.json({ ok: true, orgId });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}