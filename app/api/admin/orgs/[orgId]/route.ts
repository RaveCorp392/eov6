import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  await requireAdmin(req);
  const patch = await req.json();
  const allowed = ["name", "domains", "features", "texts", "acks", "commissions"] as const;
  const safe: any = {};
  for (const k of allowed) if (k in patch) safe[k] = patch[k];
  await getFirestore().doc(`orgs/${params.orgId}`).set(safe, { merge: true });
  return NextResponse.json({ ok: true });
}

