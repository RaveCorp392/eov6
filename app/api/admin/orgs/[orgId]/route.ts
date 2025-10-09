import { NextRequest, NextResponse } from "next/server";
import { getAdminApp, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  try {
    getAdminApp();
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "forbidden" }, { status: 403 });
  }

  const patch = await req.json();
  const allowed = ["name", "domains", "features", "texts", "acks", "commissions", "billing"] as const;
  const safe: any = {};
  for (const k of allowed) if (k in patch) safe[k] = patch[k];
  await adminDb.doc(`orgs/${params.orgId}`).set(safe, { merge: true });
  return NextResponse.json({ ok: true });
}
