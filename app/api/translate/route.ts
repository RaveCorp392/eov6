import "server-only";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";
import "@/lib/firebaseAdmin";

const adminDb = getFirestore();
const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!;
const FREE_PREVIEWS = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);

const ISO = new Set(["en","fr","es","de","it","pt","nl","sv","pl","ru","zh","ja","ko"]);

async function translateWithGoogle(text: string, target: string) {
  if (!GOOGLE_KEY) throw new Error("No GOOGLE_TRANSLATE_API_KEY");
  const url = "https://translation.googleapis.com/language/translate/v2?key=" + GOOGLE_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: text, target }),
  });
  if (!res.ok) throw new Error(`Translate failed: ${res.status}`);
  const data = await res.json();
  const out = data?.data?.translations?.[0]?.translatedText ?? "";
  return String(out);
}

export async function POST(req: Request) {
  try {
    const { code, text, target, commit } = await req.json();
    if (!code || typeof text !== "string") {
      return NextResponse.json({ error: "Missing code/text" }, { status: 400 });
    }
    const tgt = (String(target || "en").toLowerCase());
    if (!ISO.has(tgt)) return NextResponse.json({ error: "Unsupported target" }, { status: 400 });

    if (!commit) {
      const snap = await adminDb.doc(`sessions/${code}`).get();
      const used = Number(snap.get("translatePreviewCount") || 0);
      if (used >= FREE_PREVIEWS) {
        return NextResponse.json({ error: "preview-limit", limit: FREE_PREVIEWS }, { status: 429 });
      }
      const translatedText = await translateWithGoogle(text, tgt);
      await adminDb.doc(`sessions/${code}`).set({ translatePreviewCount: FieldValue.increment(1) }, { merge: true });
      return NextResponse.json({ translatedText, previewsRemaining: Math.max(0, FREE_PREVIEWS - used - 1) });
    }

    const translatedText = await translateWithGoogle(text, tgt);

    await adminDb.collection("sessions").doc(code).collection("messages").add({
      role: "agent",
      type: "text",
      text: translatedText,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
      meta: { translated: true, originalText: text, target: tgt },
    });

    const detailsTry = await adminDb.doc(`sessions/${code}/details/caller`).get();
    const email = detailsTry.get("email");

    let metered = "skipped (no email)";
    if (email) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customer = customers.data[0];
        if (customer) {
          await (stripe as any).meterEvents.create({
            event_name: "eov6.translate.accepted",
            payload: { stripe_customer_id: customer.id, value: "1" },
          });
          metered = "billed";
        } else {
          metered = "backfill (no customer)";
          await adminDb.collection("meter_backfill").add({ event: "eov6.translate.accepted", email, code, ts: Date.now() });
        }
      } catch (e) {
        metered = "backfill (error)";
        await adminDb.collection("meter_backfill").add({ event: "eov6.translate.accepted", email, code, ts: Date.now(), err: String(e) });
      }
    }

    return NextResponse.json({ ok: true, metered });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
