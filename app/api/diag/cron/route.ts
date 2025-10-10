export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const diagEnabled = process.env.DIAG_ENABLE === "1";

export async function GET(req: Request) {
  if (!diagEnabled) return new Response(null, { status: 404 });

  const url = new URL(req.url);
  const sent = (url.searchParams.get("key") || "").trim();
  const envKey = (process.env.CRON_SECRET || "").trim();

  return NextResponse.json({
    env: process.env.VERCEL_ENV || "unknown",
    host: url.host,
    hasKey: envKey.length > 0,
    keyLen: envKey.length,
    sentLen: sent.length,
    match: envKey.length > 0 && sent.length > 0 && safeEqual(envKey, sent),
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}