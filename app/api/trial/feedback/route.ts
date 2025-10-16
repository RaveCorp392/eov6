import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeSlug } from "@/lib/slugify";
import type { FeedbackReason } from "@/lib/feedback";
import { createSaveOfferCheckoutSession } from "@/lib/saveOffer";

export const runtime = "nodejs";

interface FeedbackBody {
  org?: string;
  email?: string;
  plan?: string;
  reason?: FeedbackReason;
  competitor?: string | null;
  message?: string | null;
}

const DISABLED_RESPONSE = NextResponse.json({ ok: false, code: "disabled" }, { status: 403 });

export async function POST(req: Request) {
  try {
    if ((process.env.FEEDBACK_ENABLE ?? "1") !== "1") {
      return DISABLED_RESPONSE;
    }

    const body = (await req.json().catch(() => ({}))) as FeedbackBody;
    const org = normalizeSlug(String(body.org || ""));
    const email = String(body.email || "").toLowerCase();
    const reason = body.reason;
    const competitor = body.competitor ? String(body.competitor) : null;
    const message = body.message ? String(body.message) : null;
    const plan = body.plan ? String(body.plan) : undefined;

    if (!org || !email || !reason) {
      return NextResponse.json({ ok: false, code: "missing_params" }, { status: 400 });
    }

    const baseDoc = {
      org,
      email,
      plan: plan || null,
      reason,
      competitor,
      message,
      createdAt: new Date(),
      offer: null,
    };

    const ref = await adminDb.collection("trialFeedback").add(baseDoc as any);

    let offerUrl: string | undefined;
    if (reason === "too_expensive") {
      const offerType = plan === "enterprise" ? "enterprise" : "team";
      const offerResult = await createSaveOfferCheckoutSession({
        org,
        email,
        offer: offerType,
      });

      if (offerResult.ok && offerResult.url) {
        offerUrl = offerResult.url;
        await ref.set({ offer: { type: offerType, url: offerResult.url } }, { merge: true });
      } else {
        await ref.set({ offer: { type: offerType } }, { merge: true });
      }
    }

    return NextResponse.json({ ok: true, id: ref.id, offerUrl });
  } catch (error) {
    console.error("feedback error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
