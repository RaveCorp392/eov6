'use server';

import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import {
  skuIsSubscription,
  skuToPriceId,
  successUrl,
  cancelUrl,
  type Sku,
} from '@/lib/billing';

// Allowed SKUs (kept in sync with /lib/billing.ts)
const ALL_SKUS = [
  'one_week',
  'solo_month',
  'team_month',
  'addon_translate',
  'solo_year',
  'team_year',
] as const;

function asSku(v: unknown): v is Sku {
  return typeof v === 'string' && (ALL_SKUS as readonly string[]).includes(v);
}

export async function createSession(rawSku: unknown) {
  if (!asSku(rawSku)) {
    throw new Error('Invalid SKU');
  }
  const sku: Sku = rawSku;
  const priceId = skuToPriceId(sku);
  if (!priceId) {
    throw new Error(`No price configured for SKU: ${sku}`);
  }

  const mode: Stripe.Checkout.SessionCreateParams.Mode = skuIsSubscription(sku)
    ? 'subscription'
    : 'payment';

  const params: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Persist so webhooks can resolve plan/price without expansions
    metadata: { sku, priceId },
    ...(mode === 'subscription'
      ? { subscription_data: { metadata: { sku, priceId } } }
      : {}),
  };

  const session = await stripe.checkout.sessions.create(params);
  redirect(session.url!);
}
