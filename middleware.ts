import { NextRequest, NextResponse } from "next/server";

function isStaticOrApiPath(p: string) {
  return (
    p.startsWith("/_next") ||
    p.startsWith("/api") ||
    p === "/favicon.ico" ||
    p === "/robots.txt" ||
    p === "/sitemap.xml" ||
    p.startsWith("/images") ||
    p.startsWith("/fonts")
  );
}

function isAgentPaths(p: string) {
  return p === "/agent" || p.startsWith("/agent") || p.startsWith("/s/");
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // Always skip static, API, and agent/session areas
  if (isStaticOrApiPath(pathname) || isAgentPaths(pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  if (host.startsWith("agent.") && pathname === "/") {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = "/agent";
    return NextResponse.rewrite(rewriteUrl);
  }

  // Feature toggle
  if (!process.env.TRIAL_ENABLE) {
    return NextResponse.next();
  }

  // Eligibility via query params / UTM
  const fromBypass = searchParams.get("bypass_trial_redirect") === "1";
  const fromTrialFlag = searchParams.get("trial") === "1";
  const src = (searchParams.get("utm_source") || "").toLowerCase();
  const camp = (searchParams.get("utm_campaign") || "").toLowerCase();

  const allowedSrc = (process.env.TRIAL_ALLOW_SOURCES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowedCamp = (process.env.TRIAL_ALLOW_CAMPAIGNS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const fromAllowedUtm =
    (allowedSrc.length && allowedSrc.includes(src)) ||
    (allowedCamp.length && allowedCamp.includes(camp));

  const eligible = fromTrialFlag || fromAllowedUtm;
  if (!eligible) {
    return NextResponse.next();
  }

  // Set cookie
  const days = Number(process.env.TRIAL_DAYS || "30");
  const maxAge = days * 24 * 60 * 60;

  // Redirect only when landing on "/"
  if (pathname === "/" && !fromBypass) {
    const res = NextResponse.redirect(new URL("/pricing", request.url), { status: 307 });
    res.cookies.set("trial_eligible", "1", { path: "/", sameSite: "lax", httpOnly: false, maxAge });
    res.headers.set("x-mw", "trial-redirect"); // debug header
    return res;
  }

  // Otherwise just set cookie and continue
  const res = NextResponse.next();
  res.cookies.set("trial_eligible", "1", { path: "/", sameSite: "lax", httpOnly: false, maxAge });
  res.headers.set("x-mw", "trial-pass"); // debug header
  return res;
}

export const config = {
  matcher: ["/(.*)"],
};
