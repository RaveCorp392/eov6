import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const keys = {
  SOLO_M: process.env.STRIPE_PRICE_SOLO_M,
  SOLO_Y: process.env.STRIPE_PRICE_SOLO_Y,
  TRANSLATE_M: process.env.STRIPE_PRICE_TRANSLATE_M,
  TRANSLATE_Y: process.env.STRIPE_PRICE_TRANSLATE_Y,
  TEAM5_M: process.env.STRIPE_PRICE_TEAM5_M,
  TEAM5_Y: process.env.STRIPE_PRICE_TEAM5_Y,
  TEAM5_TRANSLATE_M: process.env.STRIPE_PRICE_TEAM5_TRANSLATE_M,
  TEAM5_TRANSLATE_Y: process.env.STRIPE_PRICE_TEAM5_TRANSLATE_Y,
  ENTERPRISE_BASE_M: process.env.STRIPE_PRICE_ENTERPRISE_BASE_M, // optional
  TRANSLATE_ENTERPRISE_M: process.env.STRIPE_PRICE_TRANSLATE_ENTERPRISE_M,
  WEEKPASS: process.env.STRIPE_PRICE_WEEKPASS,
};

export async function GET(_req: NextRequest) {
  const out: Record<string, any> = {};

  for (const [name, id] of Object.entries(keys)) {
    if (!id) {
      out[name] = { present: false };
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(id);
      out[name] = {
        present: true,
        active: price.active,
        stripeId: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        product: typeof price.product === "string" ? price.product : price.product?.id,
      };
    } catch (err: any) {
      out[name] = { present: true, error: err?.message || "lookup failed" };
    }
  }

  return NextResponse.json(out, { status: 200 });
}
