export function isServerStaff(email?: string): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (e.endsWith("@eov6.com")) return true;

  const raw = process.env.ADMIN_ALLOWLIST || "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(e);
}
