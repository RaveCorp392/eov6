import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";


export async function POST(req: Request){
  try {
    const { orgId } = await req.json();
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 400 });
    }

    const snap = await adminDb.collection("orgs").doc(String(orgId)).get();
    if (!snap.exists) return NextResponse.json({ error: "Org not found" }, { status: 404 });
    const org = snap.data() as any;
    const customerId = org?.billing?.stripeCustomerId;
    if (!customerId) return NextResponse.json({ error: "No stripeCustomerId on org" }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.NEXT_PUBLIC_ADMIN_RETURN_URL || "https://agent.eov6.com/admin/org",
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

