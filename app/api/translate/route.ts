import 'server-only';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe';

const PREVIEW_LIMIT = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);
const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';

type Body = {
  code?: string;
  text?: string;
  commit?: boolean;
  sender?: 'agent' | 'caller';
  src?: string; // source language (lowercase code)
  tgt?: string; // target language (lowercase code)
  // legacy fields we’ll tolerate (ignored if src/tgt provided)
  agentLang?: string;
  callerLang?: string;
};

function lc(v?: string, d = 'en') {
  return String(v ?? d).trim().toLowerCase();
}

async function translate(text: string, src: string, tgt: string) {
  if (!GOOGLE_KEY) throw new Error('missing-google-key');
  const url = 'https://translation.googleapis.com/language/translate/v2?key=' + GOOGLE_KEY;
  const body: any = { q: text, target: tgt };
  if (src && src !== 'auto') body.source = src;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || String(res.status);
    throw new Error('translate-failed:' + msg);
  }
  const out = json?.data?.translations?.[0]?.translatedText ?? '';
  return out;
}

async function sendMeterEvent(stripeCustomerId: string) {
  try {
    // Try new namespaced API first, fall back to legacy — keep TS happy via any
    const s: any = stripe as any;
    const create =
      s?.billing?.meterEvents?.create ??
      s?.meterEvents?.create ??
      null;
    if (!create) throw new Error('meter-api-unavailable');
    await create({
      event_name: 'eov6.translate.accepted',
      payload: { stripe_customer_id: stripeCustomerId, value: '1' },
    });
    return 'ok';
  } catch {
    return 'backfill';
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const code = String(body.code || '').trim();
    const text = String(body.text || '').trim();
    const commit = Boolean(body.commit);
    const sender: 'agent' | 'caller' = body.sender === 'caller' ? 'caller' : 'agent';

    if (!code || !text) {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }

    // Session + translate config
    const sessionRef = adminDb.collection('sessions').doc(code);
    const sessionSnap = await sessionRef.get();

    const sData = (sessionSnap.exists ? sessionSnap.data() : {}) as any;
    const tConf = sData?.translate || {};
    const agentLang = lc(tConf?.agentLang);
    const callerLang = lc(tConf?.callerLang);

    // Normalize languages — request overrides config
    const src = lc(body.src ?? body.agentLang ?? (sender === 'agent' ? agentLang : callerLang));
    const tgt = lc(body.tgt ?? body.callerLang ?? (sender === 'agent' ? callerLang : agentLang));

    if (!src || !tgt) {
      return NextResponse.json({ error: 'lang-missing' }, { status: 400 });
    }

    if (!commit) {
      // Preview branch — enforce limit
      const previewsUsed = Number(tConf?.previewCount ?? sData?.translatePreviewCount ?? 0);
      if (previewsUsed >= PREVIEW_LIMIT) {
        return NextResponse.json(
          { error: 'preview-limit', previewsUsed, limit: PREVIEW_LIMIT },
          { status: 429 },
        );
      }

      const translatedText = await translate(text, src, tgt);

      // Atomically bump both counters we track (nested + legacy root)
      const batch = adminDb.batch();
      batch.set(
        sessionRef,
        {
          translate: {
            previewCount:
              // FieldValue.increment(1)
              (adminDb as any).app.firestore.FieldValue.increment(1),
          },
        },
        { merge: true },
      );
      batch.set(
        sessionRef,
        {
          translatePreviewCount:
            (adminDb as any).app.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );
      await batch.commit();

      return NextResponse.json({
        ok: true,
        translatedText,
        src,
        tgt,
        previewsUsed: previewsUsed + 1,
        limit: PREVIEW_LIMIT,
      });
    }

    // Commit branch — translate, write message, attempt meter
    const translatedText = await translate(text, src, tgt);

    const msg = {
      role: sender,
      type: 'text' as const,
      text: translatedText,
      createdAt: (adminDb as any).app.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
      orig: { text, lang: src },
      lang: { src, tgt },
      meta: { translated: true },
    };

    const messagesCol = sessionRef.collection('messages');
    await messagesCol.add(msg);

    // Try to meter — look up customer by caller email if we have one
    let metered: 'ok' | 'backfill' | 'skipped' = 'skipped';
    try {
      const callerDetailsSnap = await sessionRef.collection('details').doc('caller').get();
      const email = String(callerDetailsSnap.data()?.email || '').trim();
      if (email) {
        const list: any = await (stripe as any).customers.list({ email, limit: 1 });
        const customer = list?.data?.[0];
        if (customer?.id) {
          metered = (await sendMeterEvent(customer.id)) as any;
        } else {
          metered = 'backfill';
        }
      } else {
        metered = 'backfill';
      }
    } catch {
      metered = 'backfill';
    }

    if (metered === 'backfill') {
      await adminDb.collection('meter_backfill').add({
        at: Date.now(),
        code,
        kind: 'translate',
        note: 'missing customer or metering api unavailable',
      });
    }

    return NextResponse.json({ ok: true, translatedText, src, tgt, metered });
  } catch (err: any) {
    const msg = String(err?.message || err || 'error');
    const status = msg.startsWith('translate-failed') ? 502 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
