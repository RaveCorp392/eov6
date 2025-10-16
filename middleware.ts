import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TRIAL_DAYS_DEFAULT = 30;
const DEFAULT_SOURCES = ["ads", "paid", "sem"];
const DEFAULT_CAMPAIGNS = ["trial"];
const trialEnabled = (process.env.TRIAL_ENABLE ?? "0") === "1";
const trialDays = Number(process.env.TRIAL_DAYS ?? `${TRIAL_DAYS_DEFAULT}`) || TRIAL_DAYS_DEFAULT;
const trialCookieMaxAge = 60 * 60 * 24 * trialDays;

const toLowerSet = (list: string[]) => new Set(list.map((item) => item.trim().toLowerCase()).filter(Boolean));

const parseCsv = (input: string | undefined, fallback: string[]) => {
  if (!input) return toLowerSet(fallback);
  return toLowerSet(input.split(","));
};

const allowedSources = parseCsv(process.env.TRIAL_ALLOW_SOURCES, DEFAULT_SOURCES);
const allowedCampaigns = parseCsv(process.env.TRIAL_ALLOW_CAMPAIGNS, DEFAULT_CAMPAIGNS);

const hasFileExtension = (pathname: string) => /\.[^/]+$/.test(pathname);

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const host = req.headers.get("host") || "";
  const pathname = nextUrl.pathname;

  let response: NextResponse | null = null;

  if (host.startsWith("agent.") && pathname === "/") {
    const rewriteUrl = nextUrl.clone();
    rewriteUrl.pathname = "/agent";
    response = NextResponse.rewrite(rewriteUrl);
  }

  if (!trialEnabled) {
    return response ?? NextResponse.next();
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return response ?? NextResponse.next();
  }

  if (hasFileExtension(pathname)) {
    return response ?? NextResponse.next();
  }

  const searchParams = nextUrl.searchParams;
  const hasTrialFlag = searchParams.get("trial") === "1";
  const source = searchParams.get("utm_source")?.toLowerCase();
  const campaign = searchParams.get("utm_campaign")?.toLowerCase();

  const sourceAllowed = source ? allowedSources.has(source) : false;
  const campaignAllowed = campaign ? allowedCampaigns.has(campaign) : false;

  if (!hasTrialFlag && !sourceAllowed && !campaignAllowed) {
    return response ?? NextResponse.next();
  }

  const res = response ?? NextResponse.next();
  res.cookies.set({
    name: "trial_eligible",
    value: "true",
    maxAge: trialCookieMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
