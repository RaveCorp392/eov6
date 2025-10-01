// app/api/stripe/webhooks/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { resolveOrgForEmail } from "@/lib/org-resolver";
import { getFirestore } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOW_AUTOCREATE = process.env.ALLOW_AUTOCREATE_ORG_ON_CHECKOUT === "true";

function sanitizeOrgIdCandidate(input: string) {
  return input.replace(/[^a-z0-9_-]/g, "").slice(0, 24);
}

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
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
    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (!email) {
      console.warn("checkout.session.completed missing email", session.id);
      return new Response("ok", { status: 200 });
    }

    const db = getFirestore();
    const entRef = db.collection("entitlements").doc(email);
    const existingEnt = await entRef.get();
    const existingOrg = existingEnt.exists ? ((existingEnt.data() as any)?.orgId || null) : null;
    const resolved = await resolveOrgForEmail(db, email);

    let orgId: string | null = resolved || existingOrg || null;

    if (!orgId && ALLOW_AUTOCREATE) {
      const company = (session?.metadata?.company || "").toString().trim().toLowerCase();
      const domainCandidate = (email.split("@")[1] || "").split(".")[0] || "";
      const baseCandidate = company || domainCandidate;
      const rawId = baseCandidate || `org_${Date.now()}`;
      const newId = sanitizeOrgIdCandidate(rawId) || `org_${Date.now()}`;
      const orgRef = db.collection("orgs").doc(newId);
      await orgRef.set(
        {
          name: company || newId,
          texts: { privacyStatement: "" },
          createdAt: Date.now(),
        },
        { merge: true }
      );
      orgId = newId;
    }

    await entRef.set(
      {
        orgId: orgId || null,
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

    const meteredQty = invoice.lines.data.reduce((sum, line) => {
      const hasPrice = "price" in line && line.price;
      const isMetered = hasPrice && (line as any).price?.recurring?.usage_type === "metered";
      return sum + (isMetered ? (line.quantity ?? 0) : 0);
    }, 0);

    console.log("Metered translations this period:", meteredQty, {
      customer: invoice.customer,
      amount_due: invoice.amount_due,
    });
  }

  return new Response("ok", { status: 200 });
}