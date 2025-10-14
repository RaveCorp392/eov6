/**
 * Turn "Acme Pty Ltd" into "acme-pty-ltd".
 * Removes diacritics, collapses dashes, trims edges.
 */
export function slugifyName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeSlug(input: string | null | undefined): string {
  if (!input) return "";
  return slugifyName(String(input));
}
