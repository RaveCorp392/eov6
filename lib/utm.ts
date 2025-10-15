export function setUtmCookieFromUrl() {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const has = keys.some((k) => u.searchParams.get(k));
  if (!has) return;
  const obj: Record<string, string> = {};
  keys.forEach((k) => {
    const v = u.searchParams.get(k);
    if (v) obj[k] = v;
  });
  document.cookie = `utm=${encodeURIComponent(JSON.stringify(obj))}; Path=/; Max-Age=${
    60 * 60 * 24 * 30
  }; SameSite=Lax`;
}

export function getUtmCookie(): Record<string, string> | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\\s*)utm=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}
