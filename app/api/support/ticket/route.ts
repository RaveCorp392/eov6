export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";

type SendOpts = { to: string; subject: string; text: string };

async function sendWithFallback({ to, subject, text }: SendOpts) {
  const hostPrimary = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const portEnv = Number(process.env.ZOHO_SMTP_PORT || 587);
  const user = process.env.ZOHO_SMTP_USER!;
  const pass = process.env.ZOHO_SMTP_PASS!;
  const from = process.env.EMAIL_FROM || `EOV6 <${user}>`;

  const hosts = [hostPrimary];
  if (!hosts.includes("smtp.zoho.com")) hosts.push("smtp.zoho.com");

  const combos: Array<{ host: string; port: number; secure: boolean }> = [];
  for (const h of hosts) {
    combos.push({ host: h, port: portEnv, secure: portEnv === 465 });
    if (portEnv !== 465) combos.push({ host: h, port: 465, secure: true });
  }

  let lastErr: any = null;
  for (const cfg of combos) {
    try {
      const tx = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user, pass }
      });
      const info = await tx.sendMail({ from, to, subject, text });
      return {
        ok: true,
        to,
        usedHost: cfg.host,
        usedPort: cfg.port,
        secure: cfg.secure,
        messageId: info.messageId,
        response: String(info.response || "")
      };
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw new Error(String(lastErr?.message || lastErr));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const db = getFirestore();

  try {
    const { name = "", email = "", subject = "", message = "" } = await req.json();
    if (!email || !message) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const staffTo = process.env.SUPPORT_TO || process.env.ZOHO_SMTP_USER || "";

    const ref = await db.collection("tickets").add({
      name,
      email: email.toLowerCase(),
      subject,
      message,
      status: "open",
      createdAt: startedAt
    });

    const deliveries: Array<{
      type: "staff" | "ack";
      to: string;
      ok: boolean;
      messageId?: string;
      response?: string;
      error?: string;
    }> = [];

    try {
      const staffRes = await sendWithFallback({
        to: staffTo,
        subject: `[EOV6 Support] ${subject || "(no subject)"} - ${email}`,
        text: `Ticket ${ref.id}\nFrom: ${name} <${email}>\n\n${message}`
      });
      deliveries.push({
        type: "staff",
        to: staffTo,
        ok: true,
        messageId: staffRes.messageId,
        response: staffRes.response
      });
    } catch (e: any) {
      deliveries.push({
        type: "staff",
        to: staffTo,
        ok: false,
        error: String(e?.message || e)
      });
    }

    try {
      const ackRes = await sendWithFallback({
        to: email,
        subject: "We have your request",
        text: `Thanks for reaching out - your ticket id is ${ref.id}. We will email you back shortly.\n\n- EOV6`
      });
      deliveries.push({
        type: "ack",
        to: email,
        ok: true,
        messageId: ackRes.messageId,
        response: ackRes.response
      });
    } catch (e: any) {
      deliveries.push({
        type: "ack",
        to: email,
        ok: false,
        error: String(e?.message || e)
      });
    }

    const allOk = deliveries.every((d) => d.ok);
    const someOk = deliveries.some((d) => d.ok);
    const lastResult = allOk ? "ok" : someOk ? "partial" : "error";

    await ref.set(
      {
        smtp: {
          lastResult,
          deliveries,
          updatedAt: Date.now()
        }
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id: ref.id, lastResult, deliveries });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
