export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "@/lib/firebase-admin";
import { isServerStaff } from "@/lib/server-staff";

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as { id?: string };
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const db = getFirestore();
    await db
      .collection("tickets")
      .doc(id)
      .set(
        {
          status: "closed",
          updatedAt: Date.now(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
