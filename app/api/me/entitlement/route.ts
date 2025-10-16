export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const email = user.email?.toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, code: "no_email" }, { status: 400 });
    }

    const snap = await adminDb.collection("entitlements").doc(email).get();
    const entitlement = snap.exists ? snap.data() : null;

    return NextResponse.json({ ok: true, entitlement });
  } catch (error) {
    if (error instanceof Error && error.message === "Not signed in") {
      return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
    }
    console.error("[me/entitlement] error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
