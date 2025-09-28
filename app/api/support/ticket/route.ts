export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
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
    const { name = "", email = "", subject = "", message = "" } = await req.json();
    if (!email || !message) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const db = getFirestore();
    const ref = await db.collection("tickets").add({
      name,
      email: email.toLowerCase(),
      subject,
      message,
      status: "open",
      createdAt: Date.now()
    });

    const to = process.env.SUPPORT_TO || "hello@eov6.com";
    const t = mailer();
    await t.sendMail({
      from: process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`,
      to,
      replyTo: email,
      subject: `[EOV6 Support] ${subject || "(no subject)"} — ${email}`,
      text: `Ticket ${ref.id}\nFrom: ${name} <${email}>\n\n${message}`
    });

    await t.sendMail({
      from: process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`,
      to: email,
      subject: "We’ve got your request",
      text: `Thanks for reaching out — your ticket id is ${ref.id}. We’ll email you back shortly.\n\n— EOV6`
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
