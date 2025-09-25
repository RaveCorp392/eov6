import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

type BillingCycle = "monthly" | "yearly" | "weekly";
type Plan = "solo" | "team5" | "enterprise" | "weekpass";

type CheckoutPayload = {
  plan: Plan;
  cycle?: BillingCycle;
  translate?: boolean;
  seats?: number; // enterprise only
};

function reqd(id?: string, name?: string) {
  if (!id) throw new Error(`Missing price id${name ? ` (${name})` : ""}`);
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutPayload;

    const plan = body.plan;
    const requestedCycle: BillingCycle =
      body.cycle === "yearly" ? "yearly" : body.cycle === "weekly" ? "weekly" : "monthly";
    const translate = !!body.translate;

    // Enterprise is monthly-only (server guard)
    const cycle: BillingCycle = plan === "enterprise" ? "monthly" : requestedCycle;

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let mode: "subscription" | "payment" = "subscription";
    let metaSeats = 1;

    if (plan === "solo") {
      const base = reqd(
        cycle === "yearly" ? process.env.STRIPE_PRICE_SOLO_Y : process.env.STRIPE_PRICE_SOLO_M,
        "SOLO"
      );
      items.push({ price: base, quantity: 1 });

      if (translate) {
        const add = reqd(
          cycle === "yearly" ? process.env.STRIPE_PRICE_TRANSLATE_Y : process.env.STRIPE_PRICE_TRANSLATE_M,
          "TRANSLATE"
        );
        items.push({ price: add, quantity: 1 });
      }
      metaSeats = 1;

    } else if (plan === "team5") {
      // Bundle must be quantity:1 (never x5)
      const base = reqd(
        cycle === "yearly" ? process.env.STRIPE_PRICE_TEAM5_Y : process.env.STRIPE_PRICE_TEAM5_M,
        "TEAM5"
      );
      items.push({ price: base, quantity: 1 });

      if (translate) {
        const add = reqd(
          cycle === "yearly"
            ? process.env.STRIPE_PRICE_TEAM5_TRANSLATE_Y
            : process.env.STRIPE_PRICE_TEAM5_TRANSLATE_M,
          "TEAM5_TRANSLATE"
        );
        items.push({ price: add, quantity: 1 });
      }
      metaSeats = 5;

    } else if (plan === "enterprise") {
      const seats = Math.max(6, Math.min(Number(body.seats || 0), 100));
      // Prefer a dedicated $3/seat enterprise base if provided; else fall back to SOLO_M ($5)
      const base = reqd(
        process.env.STRIPE_PRICE_ENTERPRISE_BASE_M || process.env.STRIPE_PRICE_SOLO_M,
        "ENTERPRISE_BASE_M|SOLO_M"
      );
      items.push({ price: base, quantity: seats });

      if (translate) {
        const add = reqd(process.env.STRIPE_PRICE_TRANSLATE_ENTERPRISE_M, "TRANSLATE_ENTERPRISE_M");
        items.push({ price: add, quantity: seats });
      }
      mode = "subscription";
      metaSeats = seats;

    } else if (plan === "weekpass") {
      const pass = reqd(process.env.STRIPE_PRICE_WEEKPASS, "WEEKPASS");
      items.push({ price: pass, quantity: 1 });
      mode = "payment";
      metaSeats = 1;

    } else {
      throw new Error("Invalid plan");
    }

    const site = getSiteUrl();
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: items,
      success_url: `${site}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/pricing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        plan,
        cycle,
        translate: String(translate),
        seats: String(metaSeats),
      },
    };

    if (mode === "payment") {
      (params as any).customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return new NextResponse(err?.message || "Checkout error", { status: 400 });
  }
}

