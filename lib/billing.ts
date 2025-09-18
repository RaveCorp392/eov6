// /lib/billing.ts
// Central place for price IDs, SKU ↔ price mapping, and helpers.

export const PRICES = {
  // one-time
  ONE_WEEK: process.env.STRIPE_PRICE_ONE_WEEK ?? '',

  // monthly
  SOLO_MONTH: process.env.STRIPE_PRICE_SOLO_MONTHLY ?? '',
  TEAM_MONTH: process.env.STRIPE_PRICE_TEAM_STARTER ?? '',

  // yearly
  SOLO_YEAR: process.env.STRIPE_PRICE_SOLO_YEARLY ?? '',
  TEAM_YEAR: process.env.STRIPE_PRICE_TEAM_YEARLY ?? '',

  // add-ons (monthly)
  ADDON_TRANSLATE_SOLO: process.env.STRIPE_PRICE_ADDON_TRANSLATE_SOLO ?? '',
  ADDON_TRANSLATE_TEAM: process.env.STRIPE_PRICE_ADDON_TRANSLATE_TEAM ?? '',
} as const;

// What users can click/buy via /api/checkout?sku=...
export type Sku =
  | 'one_week'
  | 'solo_month'
  | 'team_month'
  | 'solo_year'
  | 'team_year'
  | 'addon_translate_solo'
  | 'addon_translate_team';

// What we persist as a logical plan label in Firestore.
export type Plan =
  | 'free'
  | 'one_week'
  | 'solo_month'
  | 'team_month'
  | 'solo_year'
  | 'team_year'
  | 'addon_translate';

// Map checkout SKU → Stripe price id
export function skuToPriceId(sku: Sku): string {
  switch (sku) {
    case 'one_week': return PRICES.ONE_WEEK;

    case 'solo_month': return PRICES.SOLO_MONTH;
    case 'team_month': return PRICES.TEAM_MONTH;

    case 'solo_year': return PRICES.SOLO_YEAR;
    case 'team_year': return PRICES.TEAM_YEAR;

    case 'addon_translate_solo': return PRICES.ADDON_TRANSLATE_SOLO;
    case 'addon_translate_team': return PRICES.ADDON_TRANSLATE_TEAM;
  }
}

// For entitlement writes: Stripe price id → logical plan
export function priceIdToPlan(priceId: string): Plan {
  const map: Record<string, Plan> = {
    [PRICES.ONE_WEEK]: 'one_week',

    [PRICES.SOLO_MONTH]: 'solo_month',
    [PRICES.TEAM_MONTH]: 'team_month',

    [PRICES.SOLO_YEAR]: 'solo_year',
    [PRICES.TEAM_YEAR]: 'team_year',

    [PRICES.ADDON_TRANSLATE_SOLO]: 'addon_translate',
    [PRICES.ADDON_TRANSLATE_TEAM]: 'addon_translate',
  };
  return map[priceId] ?? 'free';
}

// Helper: is a given SKU a subscription flow?
export function skuIsSubscription(sku: Sku): boolean {
  return (
    sku === 'solo_month' ||
    sku === 'team_month' ||
    sku === 'solo_year' ||
    sku === 'team_year' ||
    sku === 'addon_translate_solo' ||
    sku === 'addon_translate_team'
  );
}

export const successUrl =
  process.env.STRIPE_SUCCESS_URL ??
  'http://localhost:3000/thanks?session_id={CHECKOUT_SESSION_ID}';

export const cancelUrl =
  process.env.STRIPE_CANCEL_URL ??
  'http://localhost:3000/pricing?canceled=1';
