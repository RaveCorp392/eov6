import "server-only";
import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { code, requested } = await req.json();
    if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
    await db.doc(`sessions/${code}`).set({ translate: { requested: !!requested } }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
