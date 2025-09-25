import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

type Payload = { code: string };

export async function POST(req: NextRequest) {
  try {
    const { code } = (await req.json()) as Payload;

    if (!code || !/^d{6}$/.test(code)) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const db = getFirestore();
    const ref = db.collection("sessions").doc(code);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not_found");

      const data = snap.data() || {};
      const closed = data.closed === true;
      const expiresAt = data.expiresAt as Timestamp | undefined;
      const isExpired = !!expiresAt && expiresAt.toMillis() <= Date.now();
      const already = !!data.callerJoinedAt;

      if (closed) throw new Error("closed");
      if (isExpired) throw new Error("expired");
      if (already) throw new Error("already_joined");

      tx.update(ref, {
        status: "joined",
        callerJoinedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const code = String((e as Error)?.message || "error");
    const status =
      code === "not_found" ? 404 :
      code === "expired" ? 410 :
      code === "closed" ? 409 :
      code === "already_joined" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
