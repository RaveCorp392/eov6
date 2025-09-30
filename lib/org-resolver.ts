export function resolveOrgIdFromEmail(email?: string | null): string {
  if (!email) return "";
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain || domain === "gmail.com" || domain === "outlook.com") return "";
  const slug = domain.split(".")[0] || domain;
  return slug.replace(/[^a-z0-9_-]/g, "").slice(0, 24);
}
