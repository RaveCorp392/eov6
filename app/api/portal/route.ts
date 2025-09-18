import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";


export async function GET() {
const user = await requireUser();


// Find or create customer by metadata key (in real app, store customer id in Firestore on first creation)
const customer = await stripe.customers.create({
email: user.email || undefined,
metadata: { firebase_uid: user.uid },
}, { idempotencyKey: `cust_${user.uid}` });


const portal = await stripe.billingPortal.sessions.create({
customer: customer.id,
return_url: process.env.STRIPE_PORTAL_RETURN_URL!,
});


return NextResponse.redirect(portal.url, { status: 303 });
}