// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";       // Stripe SDK needs Node runtime
export const dynamic = "force-dynamic";

type Sku =
  | "one_week"
  | "solo_month"
  | "team_month"
  | "solo_year"
  | "team_year"
  | "addon_translate"
  | "addon_translate_solo"
  | "addon_translate_team"
  | "translate_payg";

const PRICE_MAP: Record<Sku, string | undefined> = {
  one_week: process.env.STRIPE_PRICE_ONE_WEEK,                  // one-time
  solo_month: process.env.STRIPE_PRICE_SOLO_MONTHLY,            // recurring
  team_month: process.env.STRIPE_PRICE_TEAM_STARTER,            // recurring
  solo_year: process.env.STRIPE_PRICE_SOLO_YEARLY,              // recurring
  team_year: process.env.STRIPE_PRICE_TEAM_YEARLY,              // recurring
  addon_translate: process.env.STRIPE_PRICE_ADDON_TRANSLATE,    // recurring
  addon_translate_solo: process.env.STRIPE_PRICE_ADDON_TRANSLATE,
  addon_translate_team: process.env.STRIPE_PRICE_ADDON_TRANSLATE_TEAM,
  translate_payg: process.env.STRIPE_PRICE_TRANSLATE_PAYG,      // metered price (recurring)
};

function skuToPriceId(sku: Sku): string | null {
  return PRICE_MAP[sku] ?? null;
}

export async function POST(req: Request) {
  try {
    const { sku, customer_email } = (await req.json()) as {
      sku: Sku | string;
      customer_email?: string;
    };

    const allowed = [
      "one_week",
      "solo_month",
      "team_month",
      "solo_year",
      "team_year",
      "addon_translate",
      "addon_translate_solo",
      "addon_translate_team",
      "translate_payg",
    ] as const;

    const normalized: Sku = (allowed as readonly string[]).includes(sku as string)
      ? (sku as Sku)
      : "solo_month";

    const priceId = skuToPriceId(normalized);
    if (!priceId) {
      return NextResponse.json({ error: "Unknown SKU" }, { status: 400 });
    }

    // one_week is a one-time payment; everything else is a subscription
    const mode: "payment" | "subscription" =
      normalized === "one_week" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email,
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    console.error("checkout POST error", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
