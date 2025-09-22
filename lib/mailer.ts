import "server-only";
import nodemailer from "nodemailer";

const host = process.env.ZOHO_SMTP_HOST || process.env.SMTP_HOST || "smtp.zoho.com";
const port = Number(process.env.ZOHO_SMTP_PORT || process.env.SMTP_PORT || 587);
const user = process.env.ZOHO_SMTP_USER || process.env.SMTP_USER || "";
const pass = process.env.ZOHO_SMTP_PASS || process.env.SMTP_PASS || "";
const fromDefault = process.env.EMAIL_FROM || user;

const transporter = user && pass ? nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
}) : null;

export async function sendMailZoho({
  to,
  subject,
  html,
  text,
  from = fromDefault,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  if (!transporter) throw new Error("Zoho SMTP not configured");
  await transporter.sendMail({ from, to, subject, html, text: text || "" });
}

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
    const text = await res.text();
    throw new Error(`MailerLite error ${res.status}: ${text}`);
  }
}

export async function sendAdminMail(opts: { subject: string; text: string }) {
  if (!transporter) return;
  await transporter.sendMail({
    from: fromDefault || user || ADMIN_EMAIL,
    to: ADMIN_EMAIL,
    subject: opts.subject,
    text: opts.text,
  });
}
