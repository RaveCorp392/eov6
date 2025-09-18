// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { addToMailerLite, sendAdminMail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    let body: any = {};
    if (ct.includes("application/json")) {
      body = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      form.forEach((v, k) => (body[k] = v));
    } else {
      return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
    }

    const { name, email, company, message } = body;
    if (!email || !message) {
      return NextResponse.json({ error: "Missing email or message" }, { status: 400 });
    }

    // 1) Add / update in MailerLite (lists/segments/automation can handle the auto-reply)
    await addToMailerLite({ email, name, company });

    // 2) Send an internal heads-up (optional; only if SMTP_* envs exist)
    await sendAdminMail({
      subject: "New contact from EOV6",
      text: `Name: ${name || "-"}\nEmail: ${email}\nCompany: ${company || "-"}\n\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("contact POST failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
