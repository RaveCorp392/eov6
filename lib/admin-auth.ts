import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

const ALLOW = (process.env.ADMIN_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_DEBUG = process.env.DEBUG_API === "1";

export async function requireAdmin(req: NextRequest): Promise<{ uid: string; email: string }>{
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) throw new Error("no-token");
    const decoded = await getAuth().verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();
    if (!email) throw new Error("no-email");
    if (!ALLOW.includes(email)) throw new Error(`forbidden:${email}`);
    if (ADMIN_DEBUG) console.log("[requireAdmin] ok", { email, allow: ALLOW });
    return { uid: decoded.uid, email };
  } catch (e: any) {
    if (ADMIN_DEBUG) console.log("[requireAdmin] fail", e?.message);
    throw e;
  }
}
