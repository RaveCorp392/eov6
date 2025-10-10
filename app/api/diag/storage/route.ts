export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { bucket, getBucketName } from "@/lib/firebase-admin";

export async function GET() {
  const bucketName = getBucketName();
  try {
    const [files] = await bucket.getFiles({ prefix: "uploads/", maxResults: 1, autoPaginate: false });
    return NextResponse.json({ ok: true, bucket: bucketName, sample: files[0]?.name ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, bucket: bucketName, error: String(e?.message || e) });
  }
}
