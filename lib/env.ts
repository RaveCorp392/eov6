export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required (e.g., https://www.eov6.com)");
  }
  return raw.replace(/\/+$/, "");
}
