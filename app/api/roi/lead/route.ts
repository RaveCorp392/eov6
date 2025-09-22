import { NextRequest, NextResponse } from "next/server";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { sendMailZoho } from "@/lib/mailer";
import { getAdminApp } from "@/lib/firebaseAdmin";

function seatBucket(agents: number): string {
  if (agents >= 10000) return "10k+";
  if (agents >= 5000) return "5k-9.9k";
  if (agents >= 2500) return "2.5k-4.9k";
  if (agents >= 1000) return "1k-2.4k";
  if (agents >= 500) return "500-999";
  if (agents >= 250) return "250-499";
  if (agents >= 100) return "100-249";
  if (agents >= 50) return "50-99";
  if (agents >= 10) return "10-49";
  return "<10";
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[ch] || ch
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const db = getFirestore(getAdminApp());
  let salesSent = false;
  let leadSent = false;

  try {
    const body = await req.json();
    const emailRaw = String(body.email || "").trim();

    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const honeypot = body.hp ?? "";
    if (honeypot && String(honeypot).trim().length > 0) {
      return NextResponse.json({ ok: true, mailed: { sales: false, lead: false } });
    }

    const ipHeader = req.headers.get("x-forwarded-for") || "";
    const payload = {
      email: emailRaw.toLowerCase(),
      company: String(body.company || body.org || "").trim(),
      inputs: body.inputs || {},
      outputs: body.outputs || {},
      consentEmail: Boolean(body.consentEmail ?? body.consent),
      page: body.page || "/pricing",
      createdAt: Timestamp.now(),
      userAgent: req.headers.get("user-agent") || "",
      ip: ipHeader.split(",")[0]?.trim() || "",
    };

    await db.collection("leads").add(payload);

    const agents = Number(payload.inputs?.agents || 0);
    const bucket = seatBucket(agents);

    try {
      const toSales = agents >= 1000
        ? (process.env.SALES_TO_ENTERPRISE || process.env.SALES_TO || "")
        : (process.env.SALES_TO || "");

      if (!toSales) throw new Error("SALES_TO not configured");

      const subject = `[EOV6 ROI Lead] ${bucket} seats - ${payload.company || payload.email}`;
      const html = `
        <h2>New ROI Lead</h2>
        <p><b>Email:</b> ${esc(payload.email)}</p>
        <p><b>Company:</b> ${esc(payload.company)}</p>
        <p><b>Seat bucket:</b> ${bucket}</p>
        <h3>Inputs</h3>
        <pre>${esc(JSON.stringify(payload.inputs, null, 2))}</pre>
        <h3>Outputs</h3>
        <pre>${esc(JSON.stringify(payload.outputs, null, 2))}</pre>
        <p style="color:#888">UA: ${esc(payload.userAgent)} &middot; IP: ${esc(String(payload.ip))}</p>
      `;
      const text = `[${bucket} seats] ${payload.company || payload.email}\n\nInputs:\n${JSON.stringify(payload.inputs, null, 2)}\n\nOutputs:\n${JSON.stringify(payload.outputs, null, 2)}\nUA: ${payload.userAgent}\nIP: ${payload.ip}`;

      await sendMailZoho({
        to: toSales,
        subject,
        html,
        text,
      });
      salesSent = true;
    } catch (err: any) {
      console.error("[roi/mail:sales]", err?.message || err);
    }

    if (payload.consentEmail && payload.email) {
      try {
        const subject = "Your EOV6 ROI estimate";
        const html = `
          <p>Thanks for trying EOV6's ROI calculator.</p>
          <p><b>Seat bucket:</b> ${bucket}</p>
          <h3>Your inputs</h3>
          <pre>${esc(JSON.stringify(payload.inputs, null, 2))}</pre>
          <h3>Estimate</h3>
          <pre>${esc(JSON.stringify(payload.outputs, null, 2))}</pre>
          <p>Reply to this email for a quick demo or start a session: <a href="https://eov6.com/agent">eov6.com/agent</a></p>
        `;
        const text = `Seat bucket: ${bucket}\n\nInputs:\n${JSON.stringify(payload.inputs, null, 2)}\n\nEstimate:\n${JSON.stringify(payload.outputs, null, 2)}\n\nNeed help? https://eov6.com/agent`;

        await sendMailZoho({
          to: payload.email,
          subject,
          html,
          text,
        });
        leadSent = true;
      } catch (err: any) {
        console.error("[roi/mail:lead]", err?.message || err);
      }
    }

    return NextResponse.json({ ok: true, mailed: { sales: salesSent, lead: leadSent } });
  } catch (err: any) {
    console.error("[roi/lead]", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "lead-error" }, { status: 500 });
  }
}
