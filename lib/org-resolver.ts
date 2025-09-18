export function resolveOrgIdFromEmail(email?: string | null): string {
  if (!email) return "default";
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain === "gmail.com") return "fivebyte";
  return "default";
}

