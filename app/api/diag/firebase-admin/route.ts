export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirestore, getStorage } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const db = getFirestore();
    const storage = getStorage();
    const projectId = (db as any).app?.options?.projectId || process.env.GOOGLE_CLOUD_PROJECT || null;
    const bucketName = storage.bucket().name || null;
    return NextResponse.json({ ok: true, projectId, bucketName });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
