// app/api/stripe/webhooks/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { getFirestore } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(base: string) {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

async function ensureOrgForEmail(
  db: FirebaseFirestore.Firestore,
  email: string,
  billing: {
    plan: string;
    cycle: string;
    seats: number;
    customerId?: string | null;
    subscriptionId?: string | null;
  }
) {
  const [local, domain] = email.split("@");
  let base = slugify(local || "org");
  if (!base) base = "org";

  // ensure unique slug: try base, then base-abc
  let orgId = base;
  let tries = 0;
  while (tries < 5) {
    const exists = await db.collection("orgs").doc(orgId).get();
    if (!exists.exists) break;
    orgId = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    tries++;
  }

  const orgRef = db.collection("orgs").doc(orgId);
  const now = Date.now();

  await orgRef.set(
    {
      name: base.charAt(0).toUpperCase() + base.slice(1),
      domains: domain ? [domain] : [],
      features: { allowUploads: false, translateUnlimited: false },
      texts: {},
      billing: {
        plan: billing.plan,
        cycle: billing.cycle,
        seats: billing.seats,
        customerId: billing.customerId || null,
        subscriptionId: billing.subscriptionId || null,
        createdAt: now,
      },
      createdFromStripe: true,
      createdAt: now,
      pendingOwnerEmail: email,
    },
    { merge: true }
  );

  return orgId;
}

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Invalid signature: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const plan = metadata.plan || "solo";
    const cycle = metadata.cycle || "monthly";
    const seats = Math.max(1, Number(metadata.seats || "1") || 1);
    const translate = metadata.translate === "true" || metadata.translate === "1";
    const customerEmail = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!customerEmail) {
      console.warn("checkout.session.completed missing email", session.id);
      return new Response("ok", { status: 200 });
    }

    const db = getFirestore();
    const orgId = await ensureOrgForEmail(db, customerEmail, {
      plan,
      cycle,
      seats,
      customerId: customerId || null,
      subscriptionId: subscriptionId || null,
    });

    const entRef = db.collection("entitlements").doc(customerEmail);
    await entRef.set(
      {
        orgId,
        plan,
        cycle,
        seats,
        translate,
        customerId: customerId || null,
        subscriptionId: subscriptionId || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } else if (event.type === "invoice.finalized") {
    const invoice = event.data.object as Stripe.Invoice;

    // Guard access to price with an `in` check so TS is happy.
    const meteredQty = invoice.lines.data.reduce((sum, line) => {
      // Narrowing for TS:
      const hasPrice = "price" in line && line.price;
      const isMetered =
        hasPrice &&
        (line as any).price?.recurring?.usage_type === "metered";

      return sum + (isMetered ? (line.quantity ?? 0) : 0);
    }, 0);

    console.log("Metered translations this period:", meteredQty, {
      customer: invoice.customer,
      amount_due: invoice.amount_due,
    });

    // Optional: persist to Firestore if you want a snapshot.
  }

  return new Response("ok", { status: 200 });
}
