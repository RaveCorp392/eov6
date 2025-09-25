import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sid = new URL(req.url).searchParams.get("session_id");
  if (!sid) return NextResponse.json({});
  const s = await stripe.checkout.sessions.retrieve(sid);
  return NextResponse.json({
    plan: s.metadata?.plan || "",
    cycle: s.metadata?.cycle || "",
    seats: Number(s.metadata?.seats || "0"),
    translate: s.metadata?.translate === "true",
  });
}
