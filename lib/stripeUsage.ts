// lib/stripeUsage.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Record N translation events for a Stripe customer */
export async function recordTranslateUsage(stripeCustomerId: string, units = 1) {
  const idempotencyKey = `translate:${stripeCustomerId}:${Date.now()}`;
  await stripe.billing.meterEvents.create(
    {
      event_name: "eov6.translate.accepted",
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: String(units), // 👈 must be string
      },
    },
    { idempotencyKey }
  );
}
