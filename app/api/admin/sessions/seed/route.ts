import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

// WARNING: test-only helper. Remove or lock before launch.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, orgId } = await req.json();
    if (!code || !orgId) {
      return NextResponse.json({ ok: false, error: "code/orgId required" }, { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    const ref = db.doc(`sessions/${code}`);
    await ref.set(
      {
        orgId,
        ackProgress: {},
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "seed-error" }, { status: 500 });
  }
}
