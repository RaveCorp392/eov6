export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { code } = (await req.json()) as { code?: string };
    const sessionCode = typeof code === "string" ? code.trim() : "";
    if (!sessionCode) {
      return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }

    const db = getFirestore();
    const ref = db.collection("sessions").doc(sessionCode);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not_found");

      const data = snap.data() || {};
      if (data.closed === true) throw new Error("closed");

      const expiresAtValue = data.expiresAt;
      const expiresAtMs =
        typeof expiresAtValue === "number"
          ? expiresAtValue
          : typeof expiresAtValue?.toMillis === "function"
          ? expiresAtValue.toMillis()
          : null;
      if (expiresAtMs && expiresAtMs <= Date.now()) throw new Error("expired");

      if (data.callerJoinedAt) throw new Error("already_joined");

      tx.update(ref, {
        status: "joined",
        callerJoinedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status =
      msg === "not_found"
        ? 404
        : msg === "expired"
        ? 410
        : msg === "closed"
        ? 409
        : msg === "already_joined"
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
