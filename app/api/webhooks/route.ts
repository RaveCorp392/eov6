// app/api/stripe/webhooks/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (event.type === "invoice.finalized") {
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
