export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, adminBucket } from "@/lib/firebase-admin";

function isAllowed(req: Request, email?: string) {
  const secret = process.env.CRON_SECRET || "";
  if (secret && req.headers.get("x-cron-secret") === secret) return true;
  const e = (email || "").toLowerCase();
  return e.endsWith("@eov6.com");
}

export async function GET(req: NextRequest) {
  try {
    let email = "";
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (idToken) {
      try {
        const decoded = await getAuth().verifyIdToken(idToken);
        email = (decoded.email || "").toLowerCase();
      } catch {}
    }
    if (!isAllowed(req, email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const projectId = (adminDb as any).app?.options?.projectId || process.env.GOOGLE_CLOUD_PROJECT || null;
    const bucketName = adminBucket.name || null;
    return NextResponse.json({ ok: true, projectId, bucketName });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
