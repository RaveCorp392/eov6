import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = envSite || req.nextUrl.origin || "https://www.eov6.com";
  return NextResponse.json({
    origin,
    hasKey: !!process.env.STRIPE_SECRET_KEY,
    prices: {
      solo_m: process.env.STRIPE_PRICE_SOLO_M || "",
      solo_y: process.env.STRIPE_PRICE_SOLO_Y || "",
      team_m: process.env.STRIPE_PRICE_TEAM_M || "",
      team_y: process.env.STRIPE_PRICE_TEAM_Y || "",
      tr_m:   process.env.STRIPE_PRICE_TRANSLATE_M || "",
      tr_y:   process.env.STRIPE_PRICE_TRANSLATE_Y || "",
    }
  });
}
