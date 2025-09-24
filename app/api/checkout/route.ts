import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function prices() {
  const long = {
    solo: {
      monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "",
      yearly: process.env.STRIPE_PRICE_SOLO_YEARLY || "",
    },
    team: {
      monthly: process.env.STRIPE_PRICE_TEAM_STARTER || "",
      yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || "",
    },
    translate: {
      monthly: process.env.STRIPE_PRICE_ADDON_TRANSLATE || "",
      yearly: process.env.STRIPE_PRICE_ADDON_TRANSLATE_YEARLY || "",
    },
  };

  const short = {
    solo: {
      monthly: process.env.STRIPE_PRICE_SOLO_M || "",
      yearly: process.env.STRIPE_PRICE_SOLO_Y || "",
    },
    team: {
      monthly: process.env.STRIPE_PRICE_TEAM_M || "",
      yearly: process.env.STRIPE_PRICE_TEAM_Y || "",
    },
    translate: {
      monthly: process.env.STRIPE_PRICE_TRANSLATE_M || "",
      yearly: process.env.STRIPE_PRICE_TRANSLATE_Y || "",
    },
  };

  return {
    solo: {
      monthly: long.solo.monthly || short.solo.monthly,
      yearly: long.solo.yearly || short.solo.yearly,
    },
    team: {
      monthly: long.team.monthly || short.team.monthly,
      yearly: long.team.yearly || short.team.yearly,
    },
    translate: {
      monthly: long.translate.monthly || short.translate.monthly,
      yearly: long.translate.yearly || short.translate.yearly,
    },
  };
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[checkout] missing STRIPE_SECRET_KEY");
      return NextResponse.json({ ok: false, error: "stripe key not configured" }, { status: 500 });
    }

    const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const reqOrigin = req.nextUrl?.origin || "";
    const origin = envSite || reqOrigin || "https://www.eov6.com";

    const { plan, interval, seats = 1, translate = 0 } = await req.json() || {};

    if (!["solo", "team"].includes(plan)) {
      if (plan === "enterprise") {
        return NextResponse.json({ ok: false, error: "enterprise via contact sales" }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: "invalid plan" }, { status: 400 });
    }

    if (!["monthly", "yearly"].includes(interval)) {
      return NextResponse.json({ ok: false, error: "invalid interval" }, { status: 400 });
    }

    const p = prices();
    const baseId = p[plan as "solo" | "team"][interval as "monthly" | "yearly"];
    if (!baseId) {
      console.error("[checkout] price not configured", { plan, interval, p });
      return NextResponse.json({ ok: false, error: "price not configured" }, { status: 500 });
    }

    const qty = Math.max(1, Number(seats) || 1);

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: baseId, quantity: qty },
    ];

    if (translate) {
      const addOnId = p.translate[interval as "monthly" | "yearly"];
      if (!addOnId) {
        console.error("[checkout] translate price not configured", { interval, p });
        return NextResponse.json({ ok: false, error: "translate price not configured" }, { status: 500 });
      }
      line_items.push({ price: addOnId, quantity: qty });
    }

    const success_url = `${origin}/thanks`;
    const cancel_url = `${origin}/pricing?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items,
      allow_promotion_codes: true,
      success_url,
      cancel_url,
      metadata: {
        plan,
        interval,
        seats: String(qty),
        translate: String(translate),
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("[checkout:error]", e?.message || e, e?.stack || "");
    const msg = String(e?.message || "checkout-error");
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
