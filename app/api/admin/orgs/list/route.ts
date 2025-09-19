import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getFirestore();
    const snap = await db.collection("orgs").orderBy("createdAt", "desc").limit(100).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok: true, rows }, { status: 200 });
  } catch (e: any) {
    const msg: string = e?.message || "list-error";
    console.error("[orgs/list]", msg);
    const status = msg.startsWith("forbidden") || msg === "no-token" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

