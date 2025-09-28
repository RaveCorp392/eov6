export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendWithZohoFallback } from "@/lib/mail";

function getToFromUrl(req: NextRequest) {
  return req.nextUrl.searchParams.get("to") || "";
}

async function getToFromBody(req: NextRequest) {
  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      const j = await req.json();
      return (j?.to as string) || "";
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      const params = new URLSearchParams(txt);
      return params.get("to") || "";
    }
  } catch {}
  return "";
}

export async function GET(req: NextRequest) {
  const to = getToFromUrl(req) || "hello@eov6.com";
  try {
    const res = await sendWithZohoFallback({ to, subject: "EOV6 SMTP test", text: "SMTP OK" });
    return NextResponse.json({ ok: true, to, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let to = getToFromUrl(req);
  if (!to) to = await getToFromBody(req);
  if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });
  try {
    const res = await sendWithZohoFallback({ to, subject: "EOV6 SMTP test", text: "SMTP OK" });
    return NextResponse.json({ ok: true, to, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
