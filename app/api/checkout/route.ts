// /app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // your existing client
import { cancelUrl, skuIsSubscription, skuToPriceId, successUrl } from '@/lib/billing';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sku = (url.searchParams.get('sku') ?? '').trim() as
    | 'one_week'
    | 'solo_month'
    | 'team_month'
    | 'addon_translate'
    | 'solo_year'
    | 'team_year';

  const priceId = skuToPriceId(sku);
  if (!priceId) {
    return NextResponse.json({ error: 'Unknown SKU' }, { status: 400 });
  }

  const mode: Stripe.Checkout.SessionCreateParams.Mode = skuIsSubscription(sku)
    ? 'subscription'
    : 'payment';

  const params: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Helps webhooks resolve plan without expanding line_items
    metadata: { sku, priceId },
    ...(mode === 'subscription'
      ? { subscription_data: { metadata: { sku, priceId } } }
      : {}),
  };

  const session = await stripe.checkout.sessions.create(params);
  return NextResponse.redirect(session.url!, { status: 303 });
}
