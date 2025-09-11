// /app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { mailerLiteSubscribe, sendSmtpThankYou } from '@/lib/mailer';

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Bad input' }, { status: 400 });

  const { email, name, message } = parsed.data;
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  let mailerLiteId: string | null = null;
  try {
    mailerLiteId = await mailerLiteSubscribe(email, name);
  } catch (e) {
    console.warn('MailerLite subscribe failed (non-fatal):', e);
  }

  await adminDb.collection('contacts').doc(id).set({
    id, email, name: name ?? null, message: message ?? null,
    source: 'contact_form', mailerLiteId, createdAt,
  });

  // Optional friendly auto-reply via SMTP
  try { await sendSmtpThankYou(email, name); } catch {}

  return NextResponse.json({ ok: true });
}
