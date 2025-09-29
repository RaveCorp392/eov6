export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "@/lib/firebase-admin";
import { isServerStaff } from "@/lib/server-staff";

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "no_token" }, { status: 401 });
    }

    const adminAuth = getAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email || "";

    if (!isServerStaff(email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const db = getFirestore();
    const snap = await db
      .collection("tickets")
      .where("status", "==", "open")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json({ ok: true, tickets: rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
