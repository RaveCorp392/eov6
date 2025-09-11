// lib/mailer.ts
import nodemailer from "nodemailer";

const ML_TOKEN = process.env.MAILERLITE_TOKEN || "";
const ML_GROUP_ID = process.env.MAILERLITE_GROUP_ID || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hello@eov6.com";

export async function addToMailerLite(contact: { email: string; name?: string; company?: string }) {
  if (!ML_TOKEN) return; // no-op in dev
  const payload: any = {
    email: contact.email,
    fields: {
      name: contact.name || "",
      company: contact.company || "",
    },
  };
  if (ML_GROUP_ID) payload.groups = [ML_GROUP_ID];

  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ML_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 409) {
    // 409 = already in list
    const text = await res.text();
    throw new Error(`MailerLite error ${res.status}: ${text}`);
  }
}

export async function sendAdminMail(opts: { subject: string; text: string }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return; // optional

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"EOV6" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: opts.subject,
    text: opts.text,
  });
}
