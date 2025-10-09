import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminApp, adminDb } from "@/lib/firebase-admin";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    getAdminApp();
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) || {};
  const ownerEmail = body.ownerEmail;
  if (!ownerEmail) return NextResponse.json({ error: "ownerEmail required" }, { status: 400 });

  const email = String(ownerEmail).toLowerCase();
  const orgRef = adminDb.doc(`orgs/${params.orgId}`);

  try {
    const u = await getAuth(getAdminApp()).getUserByEmail(email);
    const memberRef = orgRef.collection("members").doc(u.uid);
    await memberRef.set({ role: "owner", email, createdAt: Timestamp.now() }, { merge: true });

    // optional: delete placeholders
    const ph = await orgRef
      .collection("members")
      .where("email", "==", email)
      .where("needsUidResolution", "==", true)
      .get();
    await Promise.all(ph.docs.map((d) => d.ref.delete()));

    return NextResponse.json({ ok: true, ownerUid: u.uid, resolved: true });
  } catch {
    // owner not found -> write placeholder
    await orgRef.collection("members").add({
      role: "owner",
      email,
      createdAt: Timestamp.now(),
      needsUidResolution: true,
    });
    return NextResponse.json({ ok: true, placeholder: true });
  }
}
