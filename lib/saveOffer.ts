import Stripe from "stripe";

type OfferType = "team" | "enterprise";

interface SaveOfferInput {
  org: string;
  email: string;
  offer: OfferType;
}

export async function createSaveOfferCheckoutSession({ org, email, offer }: SaveOfferInput) {
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const priceId =
    offer === "enterprise" ? process.env.STRIPE_PRICE_ENTERPRISE_SAVE : process.env.STRIPE_PRICE_TEAM_SAVE;
  const successUrl = process.env.SAVE_OFFER_SUCCESS_URL;
  const cancelUrl = process.env.SAVE_OFFER_CANCEL_URL;

  if (!stripeKey || !priceId || !successUrl || !cancelUrl) {
    return { ok: false as const, reason: "missing_env" as const };
  }

  const stripe = new Stripe(stripeKey);

  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer =
    existing.data[0] ||
    (await stripe.customers.create({
      email,
      metadata: { org, offer },
    }));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_collection: "always",
    subscription_data: {
      metadata: { org, email, offer },
    },
    metadata: { org, email, offer },
  });

  return { ok: true as const, url: session.url ?? undefined };
}
