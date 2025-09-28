export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendWithZohoFallback } from "@/lib/mail";

function urlTo(req: NextRequest) {
  return req.nextUrl.searchParams.get("to") || "";
}

async function bodyTo(req: NextRequest) {
  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      const j = await req.json();
      return (j?.to as string) || "";
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const s = await req.text();
      const p = new URLSearchParams(s);
      return p.get("to") || "";
    }
  } catch {}
  return "";
}

export async function GET(req: NextRequest) {
  // one-deploy debug (remove after green)
  if (req.nextUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      ok: true,
      debug: {
        host: process.env.ZOHO_SMTP_HOST || null,
        port: process.env.ZOHO_SMTP_PORT || null,
        userSet: !!process.env.ZOHO_SMTP_USER,
        passLen: (process.env.ZOHO_SMTP_PASS || "").length
      }
    });
  }

  const to = urlTo(req) || (process.env.SUPPORT_TO || "hello@eov6.com");
  try {
    const res = await sendWithZohoFallback({
      to,
      subject: "EOV6 SMTP test",
      text: "SMTP OK"
    });
    // res already contains ok:true; do not set 'ok' again
    return NextResponse.json({ to, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let to = urlTo(req);
  if (!to) to = await bodyTo(req);
  if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });

  try {
    const res = await sendWithZohoFallback({
      to,
      subject: "EOV6 SMTP test",
      text: "SMTP OK"
    });
    // res already contains ok:true; do not set 'ok' again
    return NextResponse.json({ to, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}