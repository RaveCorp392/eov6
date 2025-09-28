export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function mailer() {
  return nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com.au",
    port: Number(process.env.ZOHO_SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.ZOHO_SMTP_USER!, pass: process.env.ZOHO_SMTP_PASS! }
  });
}

async function send(to: string) {
  const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
  const t = mailer();
  const info = await t.sendMail({
    from,
    to,
    subject: "EOV6 SMTP test",
    text: "This is a test email from EOV6. If you see this, SMTP is working."
  });
  return { ok: true, to, messageId: info.messageId, response: String(info.response || "") };
}

function getToFromUrl(req: NextRequest) {
  return new URL(req.url).searchParams.get("to") || "";
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
      const p = new URLSearchParams(txt);
      return p.get("to") || "";
    }
  } catch {}
  return "";
}

export async function GET(req: NextRequest) {
  const to = getToFromUrl(req);
  if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });
  try {
    return NextResponse.json(await send(to));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let to = getToFromUrl(req);
  if (!to) to = await getToFromBody(req);
  if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });
  try {
    return NextResponse.json(await send(to));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
