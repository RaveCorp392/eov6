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

export async function POST(req: NextRequest) {
  try {
    let to = new URL(req.url).searchParams.get("to") || "";
    if (!to) {
      try {
        const j = await req.json();
        to = j?.to || "";
      } catch {}
    }
    if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });

    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
    const t = mailer();
    const info = await t.sendMail({
      from,
      to,
      subject: "EOV6 SMTP test",
      text: "This is a test email from EOV6. If you see this, SMTP is working."
    });

    return NextResponse.json({ ok: true, to, messageId: info.messageId, response: String(info.response || "") });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
