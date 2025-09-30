export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function validCode(code: string) {
  return /^[0-9]{6}$/.test(code);
}

export async function POST(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code") || "";
    if (!validCode(code)) return bad("invalid_code");

    const db = getFirestore();
    const snap = await db.collection("sessions").doc(code).get();
    if (!snap.exists) return bad("session_not_found", 404);

    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    if (!file) return bad("missing_file");

    const size = file.size ?? 0;
    const MAX = 20 * 1024 * 1024;
    if (size <= 0 || size > MAX) return bad("file_too_large");

    const contentType = (file as any).type || "application/octet-stream";
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (!allowed.has(contentType) && !contentType.startsWith("image/") && contentType !== "application/pdf") {
      return bad("unsupported_type");
    }

    const rawName = (file as any).name || `blob_${Date.now()}`;
    const safeName = rawName.replace(/[^\w.\-]+/g, "_");
    const path = `uploads/${code}/${Date.now()}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = getStorage().bucket();
    const gcsFile = bucket.file(path);
    await gcsFile.save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: "private, max-age=0" },
    });

    const [url] = await gcsFile.getSignedUrl({
      action: "read",
      version: "v4",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      ok: true,
      name: safeName,
      url,
      path,
      contentType,
      size,
    });
  } catch (e: any) {
    return bad(String(e?.message || e), 500);
  }
}

