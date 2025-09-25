import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

type BillingCycle = "monthly" | "yearly" | "weekly";
type Plan = "solo" | "team5" | "enterprise" | "weekpass";

type CheckoutPayload = { plan: Plan; cycle?: BillingCycle; translate?: boolean; seats?: number };

function reqd(id?: string, name?: string) {
  if (!id) throw new Error(`Missing price id${name ? ` (${name})` : ""}`);
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as CheckoutPayload;
    const plan = b.plan;
    const requested: BillingCycle =
      b.cycle === "yearly" ? "yearly" : b.cycle === "weekly" ? "weekly" : "monthly";
    const translate = !!b.translate;
    const cycle: BillingCycle = plan === "enterprise" ? "monthly" : requested;

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let mode: "subscription" | "payment" = "subscription";
    let metaSeats = 1;

    if (plan === "solo") {
      items.push({
        price: reqd(
          cycle === "yearly" ? process.env.STRIPE_PRICE_SOLO_Y : process.env.STRIPE_PRICE_SOLO_M,
          "SOLO"
        ),
        quantity: 1,
      });
      if (translate) {
        items.push({
          price: reqd(
            cycle === "yearly" ? process.env.STRIPE_PRICE_TRANSLATE_Y : process.env.STRIPE_PRICE_TRANSLATE_M,
            "TRANSLATE"
          ),
          quantity: 1,
        });
      }
      metaSeats = 1;
    } else if (plan === "team5") {
      items.push({
        price: reqd(
          cycle === "yearly" ? process.env.STRIPE_PRICE_TEAM5_Y : process.env.STRIPE_PRICE_TEAM5_M,
          "TEAM5"
        ),
        quantity: 1,
      }); // NEVER x5
      if (translate) {
        items.push({
          price: reqd(
            cycle === "yearly"
              ? process.env.STRIPE_PRICE_TEAM5_TRANSLATE_Y
              : process.env.STRIPE_PRICE_TEAM5_TRANSLATE_M,
            "TEAM5_TRANSLATE"
          ),
          quantity: 1,
        });
      }
      metaSeats = 5;
    } else if (plan === "enterprise") {
      const seats = Math.max(6, Math.min(Number(b.seats || 0), 100));
      const base = reqd(
        process.env.STRIPE_PRICE_ENTERPRISE_BASE_M || process.env.STRIPE_PRICE_SOLO_M,
        "ENTERPRISE_BASE_M|SOLO_M"
      );
      items.push({ price: base, quantity: seats });
      if (translate) {
        items.push({
          price: reqd(process.env.STRIPE_PRICE_TRANSLATE_ENTERPRISE_M, "TRANSLATE_ENTERPRISE_M"),
          quantity: seats,
        });
      }
      metaSeats = seats;
    } else if (plan === "weekpass") {
      items.push({ price: reqd(process.env.STRIPE_PRICE_WEEKPASS, "WEEKPASS"), quantity: 1 });
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
      metadata: { plan, cycle, translate: String(translate), seats: String(metaSeats) },
    };
    if (mode === "payment") (params as any).customer_creation = "always";

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return new NextResponse(err?.message || "Checkout error", { status: 400 });
  }
}
