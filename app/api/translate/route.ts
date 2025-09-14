    const snap = await sessionRef.get(); if (!snap.exists) return NextResponse.json({ error: "no-session" }, { status: 404 });
    if (!src) src = String(snap.get("translate.agentLang") || 'en').toLowerCase();
    if (!tgt) tgt = String(snap.get("translate.callerLang") || 'en').toLowerCase();import "server-only";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { LANG_INDEX } from "@/lib/languages";

const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!;
const FREE_LIMIT = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);
const norm = (s?: string) => (s || "").trim().toLowerCase();

async function sendTranslateMeterEvent(stripe: any, customerId: string) {
  try {
    const create = stripe?.billing?.meterEvents?.create ?? stripe?.meterEvents?.create;
    if (typeof create === "function") {
      await create({ event_name: "eov6.translate.accepted", payload: { stripe_customer_id: customerId, value: "1" } });
      return "metered";
    }
    return "unsupported";
  } catch {
    return "error";
  }
}

async function googleTranslate(text: string, target: string, source?: string) {
  const url = "https://translation.googleapis.com/language/translate/v2";
  const res = await fetch(`${url}?key=${GOOGLE_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target, source: source || "auto", format: "text" }),
  });
  if (!res.ok) throw new Error(`translate http ${res.status}`);
  const j = await res.json();
  const t = j?.data?.translations?.[0];
  return { translatedText: t?.translatedText as string, src: t?.detectedSourceLanguage as string|undefined };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const code = body.code?.toString();
    const text = (body.text ?? "").toString();
    const commit = !!body.commit;
    const sender = (body.sender || body.role || "agent") as "agent" | "caller";
    const src = norm(body.src ?? body.source ?? body.agentLang);
    const tgt = norm(body.tgt ?? body.target ?? body.callerLang);
    if (!code || !text || !tgt) return NextResponse.json({ error: "bad-request" }, { status: 400 });

    const sessionRef = adminDb.collection("sessions").doc(String(code));
    const snap = await sessionRef.get();
    if (!snap.exists) return NextResponse.json({ error: "no-session" }, { status: 404 });

    if (!LANG_INDEX.has(tgt)) return NextResponse.json({ error: "bad-target" }, { status: 400 });

    // Preview branch with limit check
    if (!commit) {
      const used = Number(snap.get("translatePreviewCount") ?? snap.get("translate.previewCount") ?? 0);
      if (used >= FREE_LIMIT) return NextResponse.json({ error: "preview-limit", previewsUsed: used, limit: FREE_LIMIT }, { status: 429 });
      const { translatedText, src: detected } = await googleTranslate(text, tgt, src);
      await sessionRef.set({
        translatePreviewCount: admin.firestore.FieldValue.increment(1),
        translate: { previewCount: admin.firestore.FieldValue.increment(1) },
      }, { merge: true });
      return NextResponse.json({ ok: true, translatedText, src: (src || detected || null), tgt, previewsUsed: used + 1, limit: FREE_LIMIT });
    }

    // Commit branch: write translated message + meter
    const { translatedText, src: detected } = await googleTranslate(text, tgt, src);
    const now = admin.firestore.Timestamp.now();
    const createdAtMs = Date.now();
    await sessionRef.collection("messages").add({
      role: sender === "caller" ? "caller" : "agent",
      type: "text",
      text: translatedText,
      createdAt: now,
      createdAtMs,
      orig: { text, lang: src || "" },
      lang: { src: (src || detected || "auto"), tgt },
      meta: { translated: true },
    });

    let metered: string | undefined;
    const orgId = snap.get("orgId");
    const orgUnlimited = !!orgId && !!(await adminDb.collection("orgs").doc(String(orgId)).get()).get("features.translateUnlimited");
    const email = snap.get("details.email") || snap.get("details.caller.email");
    if (!orgUnlimited && process.env.STRIPE_SECRET_KEY && email) {
      try {
        const list = await stripe.customers.list({ email, limit: 1 });
        const customer = list.data?.[0];
        if (customer?.id) {
          metered = await sendTranslateMeterEvent(stripe as any, customer.id);
          if (!metered || metered === "unsupported" || metered === "error") {
            await adminDb.collection("meter_backfill").add({ at: now, reason: "meter-unsupported", email, code });
            metered = metered ?? "backfill";
          }
        } else {
          await adminDb.collection("meter_backfill").add({ at: now, reason: "no-customer", email, code });
          metered = "backfill";
        }
      } catch (e:any) {
        await adminDb.collection("meter_backfill").add({ at: now, reason: "stripe-error", error: String(e?.message||e), email, code });
        metered = "backfill";
      }
    }

    return NextResponse.json({ ok: true, translatedText, metered, src: (src || detected || null), tgt });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 });
  }
}
