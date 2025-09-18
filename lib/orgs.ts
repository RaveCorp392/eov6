// lib/orgs.ts  (client-safe)
export function deriveOrgIdFromEmail(email?: string | null): string {
  if (!email) return 'default';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain.endsWith('ssq.com')) return 'ssq';
  return 'default';
}
