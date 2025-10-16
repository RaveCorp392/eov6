import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    const trialFeatureEnabled = trialEnabled();
    const wantTrial = !!body.trial && trialFeatureEnabled;
    const cookieStore = cookies();
    const cookieEligible = cookieStore.get('trial_eligible')?.value === 'true';
    const trialDays = Number(process.env.TRIAL_DAYS ?? '30') || 30;

    if (!org || !email) {
      return NextResponse.json({ ok: false, code: 'missing_params' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      return NextResponse.json({ ok: false, code: 'no_stripe' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);

    // default price/URLs
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY!;
    const successUrl = process.env.STRIPE_SUCCESS_URL!;
    const cancelUrl = process.env.STRIPE_CANCEL_URL!;

    const price = await stripe.prices.retrieve(priceId);
    const isMonthlyRecurring =
      price.type === 'recurring' && price.recurring?.interval === 'month' && price.recurring?.interval_count === 1;

    const allowTrialFromCookie = trialFeatureEnabled && cookieEligible && isMonthlyRecurring;

    let allowTrial = allowTrialFromCookie;
    if (!allowTrial && wantTrial) {
      const elig = await isTrialEligible(adminDb, org, email);
      allowTrial = elig.ok && isMonthlyRecurring;
    }

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ||
      (await stripe.customers.create({
        email,
        metadata: { org }
      }));

    const subscriptionMetadata = {
      org,
      email,
      trial: allowTrial ? '1' : '0'
    };

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: subscriptionMetadata
    };

    if (allowTrial) {
      subscriptionData.trial_period_days = trialDays;
      subscriptionData.trial_settings = {
        end_behavior: { missing_payment_method: 'cancel' }
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      subscription_data: subscriptionData,
      metadata: subscriptionMetadata
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
                endsAt: computeTrialEnd(now, trialDays),
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
