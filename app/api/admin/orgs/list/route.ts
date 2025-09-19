import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const db = getFirestore();
  const snap = await db.collection("orgs").orderBy("createdAt", "desc").limit(100).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, rows });
}

