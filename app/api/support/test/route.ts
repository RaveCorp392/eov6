export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") || "stephen.mcleish@gmail.com";
  try {
    return NextResponse.json(await sendWithFallback({ to, subject: "EOV6 SMTP test", text: "SMTP OK" }));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let to = req.nextUrl.searchParams.get("to") || "";
  if (!to) {
    try {
      const j = await req.json();
      to = j?.to || "";
    } catch {}
  }
  if (!to) return NextResponse.json({ error: "no_to" }, { status: 400 });
  try {
    return NextResponse.json(await sendWithFallback({ to, subject: "EOV6 SMTP test", text: "SMTP OK" }));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
