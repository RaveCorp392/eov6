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
    auth: { user: process.env.ZOHO_SMTP_USER!, pass: process.env.ZOHO_SMTP_PASS! },
  });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const db = getFirestore();
  const t = mailer();

  try {
    const { name = "", email = "", subject = "", message = "" } = await req.json();
    if (!email || !message) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const staffTo = process.env.SUPPORT_TO || process.env.ZOHO_SMTP_USER || "";
    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;

    // 1) Create ticket
    const ref = await db.collection("tickets").add({
      name,
      email: email.toLowerCase(),
      subject,
      message,
      status: "open",
      createdAt: startedAt,
    });

    const deliveries: Array<{
      type: "staff" | "ack";
      to: string;
      ok: boolean;
      messageId?: string;
      response?: string;
      error?: string;
    }> = [];

    // 2) Notify staff
    try {
      const info = await t.sendMail({
        from,
        to: staffTo,
        replyTo: email,
        subject: `[EOV6 Support] ${subject || "(no subject)"} — ${email}`,
        text: `Ticket ${ref.id}\nFrom: ${name} <${email}>\n\n${message}`,
      });
      deliveries.push({ type: "staff", to: staffTo, ok: true, messageId: info.messageId, response: String(info.response || "") });
    } catch (e: any) {
      deliveries.push({ type: "staff", to: staffTo, ok: false, error: String(e?.message || e) });
    }

    // 3) Auto-acknowledge user
    try {
      const info = await t.sendMail({
        from,
        to: email,
        subject: "We have your request",
        text: `Thanks for reaching out - your ticket id is ${ref.id}. We will email you back shortly.\n\n- EOV6`,
      });
      deliveries.push({ type: "ack", to: email, ok: true, messageId: info.messageId, response: String(info.response || "") });
    } catch (e: any) {
      deliveries.push({ type: "ack", to: email, ok: false, error: String(e?.message || e) });
    }

    const allOk = deliveries.every(d => d.ok);
    const someOk = deliveries.some(d => d.ok);
    const lastResult = allOk ? "ok" : (someOk ? "partial" : "error");

    // 4) Log SMTP outcome on ticket
    await ref.set(
      {
        smtp: {
          lastResult,
          deliveries,
          updatedAt: Date.now(),
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id: ref.id, lastResult, deliveries });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}