// lib/stripe.ts
import Stripe from "stripe";

/**
 * Single shared Stripe client.
 * Do NOT pin apiVersion in code; let the SDK use the version it ships with.
 * This avoids TS literal-mismatch errors after library upgrades.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

