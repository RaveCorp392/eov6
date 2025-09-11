// lib/stripe.ts
import Stripe from 'stripe';

// Omit apiVersion so the SDK uses your account’s default — this avoids the TS
// “Type '2024-06-20' is not assignable to …” mismatch.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export const PRICES = {
  one_week: process.env.STRIPE_PRICE_ONE_WEEK!,
  solo_month: process.env.STRIPE_PRICE_SOLO_MONTHLY!,
  team_starter: process.env.STRIPE_PRICE_TEAM_STARTER!,
  addon_translate: process.env.STRIPE_PRICE_ADDON_TRANSLATE!,
} as const;

export type Sku = keyof typeof PRICES;

export function skuToPriceId(sku: Sku): string {
  return PRICES[sku];
}

export function priceIdToSku(priceId?: string | null): Sku | null {
  if (!priceId) return null;
  const hit = Object.entries(PRICES).find(([, id]) => id === priceId);
  return (hit?.[0] as Sku) ?? null;
}
