import { NextResponse } from "next/server";
import { normalizeSlug } from "@/lib/slugify";
import { createSaveOfferCheckoutSession } from "@/lib/saveOffer";

export const runtime = "nodejs";

type Body = {
  org?: string;
  email?: string;
  offer?: "team" | "enterprise";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const org = normalizeSlug(String(body.org || ""));
    const email = String(body.email || "").toLowerCase();
    const offer = (body.offer || "team").toLowerCase() === "enterprise" ? "enterprise" : "team";

    if (!org || !email) {
      return NextResponse.json({ ok: false, code: "missing_params" }, { status: 400 });
    }

    const result = await createSaveOfferCheckoutSession({ org, email, offer });
    if (!result.ok || !result.url) {
      return NextResponse.json({ ok: false, code: "missing_stripe_price" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: result.url });
  } catch (error) {
    console.error("save-offer error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
