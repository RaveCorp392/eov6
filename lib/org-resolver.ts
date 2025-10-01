import type { Firestore } from "firebase-admin/firestore";

export function resolveOrgIdFromEmail(email?: string | null): string {
  if (!email) return "";
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain || domain === "gmail.com" || domain === "outlook.com") return "";
  const slug = domain.split(".")[0] || domain;
  return slug.replace(/[^a-z0-9_-]/g, "").slice(0, 24);
}

export async function resolveEntitledOrgId(
  db: Firestore,
  email: string
): Promise<string | null> {
  const lower = (email || "").toLowerCase();
  if (!lower) return null;

  const entSnap = await db.collection("entitlements").doc(lower).get();
  const mapped = entSnap.exists ? ((entSnap.data() as any)?.orgId || null) : null;
  if (!mapped || mapped === "default") return null;

  const orgSnap = await db.collection("orgs").doc(mapped).get();
  return orgSnap.exists ? mapped : null;
}

// TODO: remove once all call sites migrate
export const resolveOrgForEmail = resolveEntitledOrgId;