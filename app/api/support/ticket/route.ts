export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { sendWithZohoFallback } from "@/lib/mail";

type DeliveryLog = {
  type: "staff" | "ack";
  to: string;
  ok: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  usedHost?: string;
  usedPort?: number;
  secure?: boolean;
};

function ticketCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `EV-${ts}-${rnd}`;
}

export async function POST(req: NextRequest) {
  const db = getFirestore();
  const startedAt = Date.now();

  try {
    const { name = "", email = "", subject = "", message = "" } = await req.json();
    if (!email || !message) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const code = ticketCode();
    const staffTo = process.env.SUPPORT_TO || process.env.ZOHO_SMTP_USER || "";
    const lowerEmail = String(email).toLowerCase();

    const ref = await db.collection("tickets").add({
      code,
      name,
      email: lowerEmail,
      subject,
      message,
      status: "open",
      priority: "normal",
      assignedTo: null,
      createdAt: startedAt,
      updatedAt: startedAt
    });

    const deliveries: DeliveryLog[] = [];

    try {
      const text = `Ticket ${code} (${ref.id})\nFrom: ${name} <${email}>\n\n${message}`;
      const res = await sendWithZohoFallback({
        to: staffTo,
        subject: `[Support] ${code} - ${subject || "(no subject)"} - ${email}`,
        text
      });
      deliveries.push({
        type: "staff",
        to: staffTo,
        ok: true,
        messageId: res.messageId,
        response: res.response,
        usedHost: res.usedHost,
        usedPort: res.usedPort,
        secure: res.secure
      });
    } catch (e: any) {
      deliveries.push({ type: "staff", to: staffTo, ok: false, error: String(e?.message || e) });
    }

    try {
      const text = `Thanks for reaching out - your ticket id is ${code}. We will email you back shortly.\n\n- EOV6`;
      const res = await sendWithZohoFallback({
        to: email,
        subject: `We have your request - ${code}`,
        text
      });
      deliveries.push({
        type: "ack",
        to: email,
        ok: true,
        messageId: res.messageId,
        response: res.response,
        usedHost: res.usedHost,
        usedPort: res.usedPort,
        secure: res.secure
      });
    } catch (e: any) {
      deliveries.push({ type: "ack", to: email, ok: false, error: String(e?.message || e) });
    }

    const allOk = deliveries.every((d) => d.ok);
    await ref.set(
      {
        smtp: {
          lastResult: allOk ? "ok" : "partial",
          deliveries,
          updatedAt: Date.now()
        }
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id: ref.id, code, lastResult: allOk ? "ok" : "partial" });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
