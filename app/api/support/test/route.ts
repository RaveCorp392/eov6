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

async function parseTo(req: NextRequest) {
  const fromUrl = req.nextUrl.searchParams.get("to") || "";
  let fromBody = "";
  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      const j = await req.json();
      fromBody = (j?.to as string) || "";
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      const p = new URLSearchParams(txt);
      fromBody = p.get("to") || "";
    }
  } catch {}
  return { fromUrl, fromBody };
}

export async function GET() {
  try {
    const to = "stephen.mcleish@gmail.com";
    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
    const t = mailer();
    const info = await t.sendMail({
      from,
      to,
      subject: "EOV6 SMTP test",
      text: "SMTP OK"
    });
    return NextResponse.json({ ok: true, to, messageId: info.messageId, response: String(info.response || "") });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
export async function POST(req: NextRequest) {
  const { fromUrl, fromBody } = await parseTo(req);
  const to = fromUrl || fromBody;
  if (!to) return NextResponse.json({ error: "no_to", debug: { fromUrl, fromBody } }, { status: 400 });

  try {
    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
    const t = mailer();
    const info = await t.sendMail({ from, to, subject: "EOV6 SMTP test", text: "SMTP OK" });
    return NextResponse.json({ ok: true, to, messageId: info.messageId, response: String(info.response || "") });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

