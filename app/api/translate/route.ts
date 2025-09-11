// app/api/translate/route.ts
import "server-only";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Config (env) ------------------------------------------------------------
const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_METER_EVENT = process.env.STRIPE_METER_TRANSLATE_EVENT_NAME || "eov6.translate.accepted";

// Fail fast if keys are missing in runtime (clear error during dev)
if (!GOOGLE_KEY) console.warn("[translate] Missing GOOGLE_TRANSLATE_API_KEY");
if (!STRIPE_SECRET) console.warn("[translate] Missing STRIPE_SECRET_KEY");

// Do NOT pin apiVersion here, to avoid TS literal churn between SDK/types.
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : (null as unknown as Stripe);

// --- Types -------------------------------------------------------------------
type TranslateBody = {
  text: string;
  target: string;               // e.g. "en", "zh-CN"
  source?: string | null;       // optional (let Google auto-detect if omitted)
  orgId?: string | null;
  userId?: string | null;
  stripeCustomerId?: string | null; // to bill metered usage
  bill?: boolean;               // default true; set false to skip metering
};

// --- Helpers -----------------------------------------------------------------
function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// Google Translate v2 REST call (API Key)
async function googleTranslateV2(params: {
  text: string;
  target: string;
  source?: string | null;
}) {
  const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`;
  const body = new URLSearchParams();
  body.append("q", params.text);
  body.append("target", params.target);
  body.append("format", "text");
  if (params.source) body.append("source", params.source);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    // This runs server-side only; no need for cache here.
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Translate API error (${res.status}): ${err}`);
  }

  type GRes = {
    data?: { translations?: Array<{ translatedText: string; detectedSourceLanguage?: string }> };
    error?: unknown;
  };
  const json = (await res.json()) as GRes;
  const tr = json.data?.translations?.[0];
  if (!tr?.translatedText) throw new Error("Translate API returned no translation");

  return {
    translatedText: tr.translatedText,
    detectedSourceLanguage: tr.detectedSourceLanguage ?? null,
  };
}

// Record one unit of metered usage on Stripe (safe no-op if misconfigured)
async function recordMeterEvent(stripeCustomerId: string) {
  if (!stripe || !STRIPE_SECRET) return { sent: false, reason: "stripe not configured" };
  try {
    // Stripe SDK types currently prefer string payload values; coerce for TS safety.
    await stripe.billing.meterEvents.create({
      event_name: STRIPE_METER_EVENT,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: "1",
      } as Record<string, string>,
    });
    return { sent: true };
  } catch (e) {
    console.error("[translate] meterEvents.create failed:", e);
    return { sent: false, reason: "stripe error" };
  }
}

// --- Route handlers -----------------------------------------------------------
export async function POST(req: Request) {
  // Basic env checks (dev-friendly)
  if (!GOOGLE_KEY) return bad("Server is missing GOOGLE_TRANSLATE_API_KEY", 500);

  let body: TranslateBody;
  try {
    body = (await req.json()) as TranslateBody;
  } catch {
    return bad("Invalid JSON");
  }

  if (!body?.text || typeof body.text !== "string") return bad("Body must include 'text' (string)");
  if (!body?.target || typeof body.target !== "string") return bad("Body must include 'target' (string)");

  // Keep our MVP simple: limit single-call payloads (we can chunk later if we need to)
  if (body.text.length > 5000) return bad("Text too long for a single request (max ~5000 chars)", 413);

  // Translate
  let translatedText = "";
  let detectedSourceLanguage: string | null = null;

  try {
    const res = await googleTranslateV2({
      text: body.text,
      target: body.target,
      source: body.source ?? undefined,
    });
    translatedText = res.translatedText;
    detectedSourceLanguage = res.detectedSourceLanguage;
  } catch (e: any) {
    console.error("[translate] translate error:", e?.message || e);
    return bad("Translation failed", 502);
  }

  // Persist a lightweight log (best-effort; do not block response)
  try {
    await adminDb.collection("translations").add({
      orgId: body.orgId ?? null,
      userId: body.userId ?? null,
      stripeCustomerId: body.stripeCustomerId ?? null,
      text: body.text,
      charCount: body.text.length,
      translatedText,
      detectedSourceLanguage,
      targetLanguage: body.target,
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn("[translate] failed to persist Firestore log:", e);
  }

  // Metered billing (optional)
  let billed: { sent: boolean; reason?: string } = { sent: false };
  const shouldBill = body.bill !== false; // default: true
  if (shouldBill && body.stripeCustomerId) {
    billed = await recordMeterEvent(body.stripeCustomerId);
  }

  return NextResponse.json({
    ok: true,
    source: detectedSourceLanguage,
    target: body.target,
    translatedText,
    billed,
  });
}

// (Optional) health check for quick pings
export async function GET() {
  return NextResponse.json({ ok: true, service: "translate", meterEvent: STRIPE_METER_EVENT });
}
