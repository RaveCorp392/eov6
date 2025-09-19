import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { orgId, name, ownerEmail, domains = [], features = {}, texts = {}, acks = {}, commissions = {} } = body || {};
    if (!orgId || !/^[a-z0-9-]{3,50}$/.test(orgId)) return NextResponse.json({ error: "Invalid orgId" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.doc(`orgs/${orgId}`);
    const exists = await orgRef.get();
    if (exists.exists) return NextResponse.json({ error: "orgId exists" }, { status: 409 });

    const orgDoc: any = {
      name,
      domains: Array.isArray(domains) ? domains : [],
      features: { allowUploads: false, translateUnlimited: false, ...(features || {}) },
      texts: { privacyStatement: "", ackTemplate: "", ...(texts || {}) },
      acks: { slots: (acks?.slots || []) },
      commissions: commissions || {},
      createdAt: FieldValue.serverTimestamp(),
    };
    await orgRef.set(orgDoc, { merge: true });

    let ownerUid: string | undefined;
    if (ownerEmail) {
      const email = String(ownerEmail).toLowerCase();
      try {
        const u = await getAuth().getUserByEmail(email);
        ownerUid = u.uid;
        await orgRef.collection("members").doc(ownerUid).set({
          role: "owner",
          email,
          createdAt: Timestamp.now(),
        }, { merge: true });
      } catch {
        await orgRef.collection("members").add({
          role: "owner",
          email,
          createdAt: Timestamp.now(),
          needsUidResolution: true,
        });
      }
    }

    return NextResponse.json({ ok: true, orgId, ownerUid, placeholder: !ownerUid });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 403 });
  }
}

