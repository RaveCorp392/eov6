import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type SubscriptionWithEmail = Stripe.Subscription & {
  customer_email?: string | null;
};

type InvoiceWithEmail = Stripe.Invoice & {
  customer_email?: string | null;
  subscription?: string | Stripe.Subscription | null;
};

function resolveEmail(input: {
  customer_email?: string | null;
  metadata?: Stripe.Metadata | null;
}): string | null {
  const emailFromCustomer = input.customer_email;
  if (emailFromCustomer && typeof emailFromCustomer === "string") {
    return emailFromCustomer.toLowerCase();
  }

  const meta = input.metadata || null;
  const fromMetadata =
    meta && typeof meta.email === "string" ? (meta.email as string) : null;
  return fromMetadata ? fromMetadata.toLowerCase() : null;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";

    if (!webhookSecret) {
      return NextResponse.json({ ok: false, code: "no_webhook_secret" }, { status: 500 });
    }
    if (!stripeKey) {
      return NextResponse.json({ ok: false, code: "no_stripe_key" }, { status: 500 });
    }

    const rawBody = Buffer.from(await req.arrayBuffer());
    const stripe = new Stripe(stripeKey);
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "customer.subscription.created": {
        const subscription = event.data.object as SubscriptionWithEmail;
        const email =
          resolveEmail({
            customer_email: subscription.customer_email,
            metadata: subscription.metadata,
          }) ?? null;

        if (email) {
          const now = new Date();
          const trialing = Boolean(subscription.trial_end && subscription.status === "trialing");

          await adminDb
            .collection("entitlements")
            .doc(email)
            .set(
              {
                plan: trialing ? "trial" : "pending",
                trial: trialing
                  ? {
                      used: true,
                      startedAt: subscription.trial_start
                        ? new Date(subscription.trial_start * 1000)
                        : now,
                      endsAt: subscription.trial_end
                        ? new Date(subscription.trial_end * 1000)
                        : null,
                    }
                  : null,
                stripe: {
                  subscriptionId: subscription.id,
                  status: subscription.status,
                  productIds: subscription.items.data
                    .map((item) => {
                      const product = item.price?.product;
                      if (!product) return null;
                      return typeof product === "string" ? product : product.id;
                    })
                    .filter((value): value is string => typeof value === "string"),
                },
              },
              { merge: true },
            );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as InvoiceWithEmail;
        const email =
          resolveEmail({
            customer_email: invoice.customer_email,
            metadata: invoice.metadata,
          }) ?? null;

        if (email) {
          await adminDb
            .collection("entitlements")
            .doc(email)
            .set(
              {
                plan: "pro",
                trial: null,
                stripe: {
                  latestInvoiceId: invoice.id,
                  subscriptionId:
                    typeof invoice.subscription === "string"
                      ? invoice.subscription
                      : invoice.subscription?.id,
                  paidAt: invoice.status_transitions?.paid_at
                    ? new Date(invoice.status_transitions.paid_at * 1000)
                    : new Date(),
                },
              },
              { merge: true },
            );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as SubscriptionWithEmail;
        const email =
          resolveEmail({
            customer_email: subscription.customer_email,
            metadata: subscription.metadata,
          }) ?? null;

        if (email) {
          await adminDb
            .collection("entitlements")
            .doc(email)
            .set(
              {
                plan: "none",
                stripe: {
                  subscriptionId: subscription.id,
                  canceledAt: subscription.canceled_at
                    ? new Date(subscription.canceled_at * 1000)
                    : new Date(),
                },
              },
              { merge: true },
            );
        }
        break;
      }

      default:
        // No-op for other events in this scaffold.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
