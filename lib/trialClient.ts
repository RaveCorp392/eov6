function getCookieValue(name: string) {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  const matcher = `${name}=`;
  const found = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(matcher));
  if (!found) return undefined;
  return decodeURIComponent(found.substring(matcher.length));
}

function setTrialCookie() {
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `trial_eligible=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function maybeSetTrialCookieFromUTM() {
  if (typeof window === "undefined") return;

  const pathname = window.location.pathname;
  if (pathname.startsWith("/agent") || pathname.startsWith("/s/")) return;

  const current = getCookieValue("trial_eligible");
  if (current === "1" || current === "true") return;

  const url = new URL(window.location.href);
  const fromTrialParam = url.searchParams.get("trial") === "1";
  const src = (url.searchParams.get("utm_source") || "").toLowerCase();
  const camp = (url.searchParams.get("utm_campaign") || "").toLowerCase();

  const allowedSources = (process.env.NEXT_PUBLIC_TRIAL_ALLOW_SOURCES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedCampaigns = (process.env.NEXT_PUBLIC_TRIAL_ALLOW_CAMPAIGNS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const matchesAllowedSource = allowedSources.length > 0 && allowedSources.includes(src);
  const matchesAllowedCampaign = allowedCampaigns.length > 0 && allowedCampaigns.includes(camp);

  if (!(fromTrialParam || matchesAllowedSource || matchesAllowedCampaign)) {
    return;
  }

  setTrialCookie();
}
