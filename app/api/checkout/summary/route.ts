import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sid = new URL(req.url).searchParams.get("session_id");
  if (!sid) return NextResponse.json({}, { status: 200 });

  const session = await stripe.checkout.sessions.retrieve(sid);
  const plan = session.metadata?.plan || "";
  const cycle = session.metadata?.cycle || "";
  const seats = Number(session.metadata?.seats || "0");
  const translate = session.metadata?.translate === "true";
  return NextResponse.json({ plan, cycle, seats, translate }, { status: 200 });
}
