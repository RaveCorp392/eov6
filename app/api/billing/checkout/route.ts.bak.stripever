import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { normalizeSlug } from '@/lib/slugify';
import { isTrialEligible, computeTrialEnd, trialEnabled } from '@/lib/trial';

export const runtime = 'nodejs';

type Body = {
  org: string;
  email: string;
  plan?: 'pro';
  trial?: boolean;
  utm?: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const org = normalizeSlug(body.org);
    const email = String(body.email || '').toLowerCase();
    const wantTrial = !!body.trial && trialEnabled();

    if (!org || !email) {
      return NextResponse.json({ ok: false, code: 'missing_params' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      return NextResponse.json({ ok: false, code: 'no_stripe' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // default price/URLs
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY!;
    const successUrl = process.env.STRIPE_SUCCESS_URL!;
    const cancelUrl = process.env.STRIPE_CANCEL_URL!;

    let allowTrial = false;
    if (wantTrial) {
      const elig = await isTrialEligible(adminDb, org, email);
      allowTrial = elig.ok;
    }

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ||
      (await stripe.customers.create({
        email,
        metadata: { org }
      }));

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: allowTrial ? 30 : undefined,
        metadata: {
          org,
          email,
          trial: allowTrial ? '1' : '0'
        }
      },
      metadata: { org, email, trial: allowTrial ? '1' : '0' }
    });

    const now = new Date();
    await adminDb
      .collection('entitlements')
      .doc(email)
      .set(
        {
          orgId: org,
          plan: allowTrial ? 'trial' : 'pending',
          trial: allowTrial
            ? {
                used: true,
                startedAt: now,
                endsAt: computeTrialEnd(now),
                source: body.utm?.utm_source ? 'ads' : 'organic',
                utm: body.utm || null
              }
            : null,
          stripe: { customerId: customer.id }
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, url: session.url, trial: allowTrial });
  } catch (e) {
    console.error('checkout error', e);
    return NextResponse.json({ ok: false, code: 'server_error' }, { status: 500 });
  }
}
