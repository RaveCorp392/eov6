export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { slugifyName } from "@/lib/slugify";

type CreateOrgPayload = {
  orgId?: string;
  name?: string;
  features?: Record<string, any>;
  domains?: string[];
  privacyStatement?: string;
  ack1?: Record<string, any>;
  ack2?: Record<string, any>;
};

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
    const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
    const requestedId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    const baseInput = requestedName || requestedId;
    const baseSlug = slugifyName(baseInput) || "org";

    const db = adminDb;
    const orgs = db.collection("orgs");

    let slug = baseSlug;
    let attempt = 2;
    // ensure uniqueness by suffixing -2, -3, etc.
    while ((await orgs.doc(slug).get()).exists) {
      slug = `${baseSlug}-${attempt++}`;
    }

    if (!slug) return NextResponse.json({ error: "invalid_org_id" }, { status: 400 });

    const ref = orgs.doc(slug);

    const now = Date.now();
    const features =
      body?.features && typeof body.features === "object"
        ? {
            ...body.features,
            allowUploads: !!body.features.allowUploads,
            translateUnlimited: !!body.features.translateUnlimited,
          }
        : { allowUploads: false, translateUnlimited: false };

    const providedDomains = Array.isArray(body?.domains)
      ? body.domains.map((d) => d.toLowerCase().trim()).filter(Boolean)
      : [];
    const ownerDomain = creatorEmail.includes("@") ? creatorEmail.split("@").pop()!.toLowerCase() : "";
    const domains = ownerDomain && !providedDomains.includes(ownerDomain)
      ? [...providedDomains, ownerDomain]
      : providedDomains;

    await ref.set(
      {
        name: requestedName || slug,
        ownerEmail: creatorEmail,
        pendingOwnerEmail: null,
        domains,
        features,
        texts: { privacyStatement: typeof body?.privacyStatement === "string" ? body.privacyStatement : "" },
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
      { orgId: slug, claimedAt: now, updatedAt: now },
      { merge: true }
    );

    const ackPayloads = [
      { id: "slot1", data: body?.ack1, order: 1 },
      { id: "slot2", data: body?.ack2, order: 2 },
    ].filter(({ data }) => data && (data.title || data.body));

    if (ackPayloads.length) {
      const batch = db.batch();
      ackPayloads.forEach(({ id, data, order }) => {
        batch.set(
          ref.collection("ackTemplates").doc(id),
          {
            title: data?.title || "",
            body: data?.body || "",
            required: !!data?.required,
            order,
          },
          { merge: true }
        );
      });
      await batch.commit();
    }

    return NextResponse.json({ ok: true, orgId: slug });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

