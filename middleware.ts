import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hasAnyUtm = (searchParams: URLSearchParams) => {
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("utm_") && value) return true;
  }
  return false;
};

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const host = req.headers.get("host") || "";

  if (host.startsWith("agent.") && nextUrl.pathname === "/") {
    const rewriteUrl = nextUrl.clone();
    rewriteUrl.pathname = "/agent";
    return NextResponse.rewrite(rewriteUrl);
  }

  if (nextUrl.pathname !== "/") return NextResponse.next();

  if (!hasAnyUtm(nextUrl.searchParams)) return NextResponse.next();

  if (nextUrl.searchParams.get("bypass_trial_redirect") === "1") {
    return NextResponse.next();
  }

  const to = new URL("/pricing", nextUrl);
  const merged = new URLSearchParams(nextUrl.search);
  merged.set("trial", "1");
  to.search = merged.toString();

  return NextResponse.redirect(to, 307);
}

export const config = {
  matcher: ["/"],
};
