import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function isAllowed(req: Request, email?: string) {
  const secret = process.env.CRON_SECRET || "";
  if (secret && req.headers.get("x-cron-secret") === secret) return true;
  const e = (email || "").toLowerCase();
  return e.endsWith("@eov6.com");
}

const keys = {
  SOLO_M: process.env.STRIPE_PRICE_SOLO_M,
  SOLO_Y: process.env.STRIPE_PRICE_SOLO_Y,
  TRANSLATE_M: process.env.STRIPE_PRICE_TRANSLATE_M,
  TRANSLATE_Y: process.env.STRIPE_PRICE_TRANSLATE_Y,
  TEAM5_M: process.env.STRIPE_PRICE_TEAM5_M,
  TEAM5_Y: process.env.STRIPE_PRICE_TEAM5_Y,
  TEAM5_TRANSLATE_M: process.env.STRIPE_PRICE_TEAM5_TRANSLATE_M,
  TEAM5_TRANSLATE_Y: process.env.STRIPE_PRICE_TEAM5_TRANSLATE_Y,
  TRANSLATE_ENTERPRISE_M: process.env.STRIPE_PRICE_TRANSLATE_ENTERPRISE_M,

  ENTERPRISE_BASE_M: process.env.STRIPE_PRICE_ENTERPRISE_BASE_M,
  WEEKPASS: process.env.STRIPE_PRICE_WEEKPASS
};

export async function GET(req: NextRequest) {
  try {
    let email = "";
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (idToken) {
      try {
        const decoded = await getAuth().verifyIdToken(idToken);
        email = (decoded.email || "").toLowerCase();
      } catch {}
    }
    if (!isAllowed(req, email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const out: Record<string, any> = {};

    for (const [name, id] of Object.entries(keys)) {
      if (!id) {
        out[name] = { present: false };
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(id);
        out[name] = {
          present: true,
          active: price.active,
          stripeId: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null,
          product: typeof price.product === "string" ? price.product : price.product?.id
        };
      } catch (err: any) {
        out[name] = { present: true, error: err?.message || "lookup failed" };
      }
    }

    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
