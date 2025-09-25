export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required (e.g., https://www.eov6.com)");
  }
  return url.replace(/[/]+$/, ""); // normalize: strip trailing slash
}
