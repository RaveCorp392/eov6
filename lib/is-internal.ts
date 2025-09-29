import { getAuth } from "firebase/auth";

function splitCSV(v?: string | null) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function isInternalAdminClient(): Promise<boolean> {
  try {
    const auth = getAuth();
    await auth.authStateReady?.();
    const email = auth.currentUser?.email?.toLowerCase() || "";

    const allow = splitCSV(process.env.NEXT_PUBLIC_INTERNAL_ADMINS);
    const domain = (process.env.NEXT_PUBLIC_INTERNAL_DOMAIN || "eov6.com").toLowerCase();

    if (!email) return false;
    if (allow.includes(email)) return true;
    if (domain && email.endsWith(`@${domain}`)) return true;

    const token = await auth.currentUser?.getIdTokenResult();
    if (token?.claims?.internalAdmin === true) return true;

    return false;
  } catch {
    return false;
  }
}
