import "server-only";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "bad-request" }, { status: 400 });

    const sessionRef = adminDb.collection("sessions").doc(String(code));

    // delete messages in batches
    const msgsRef = sessionRef.collection("messages");
    while (true) {
      const snap = await msgsRef.limit(300).get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // delete details/caller doc if present
    await sessionRef.collection("details").doc("caller").delete().catch(() => {});

    // finally delete session doc
    await sessionRef.delete().catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
