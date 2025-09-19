import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

const ALLOW = (process.env.ADMIN_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function requireAdmin(req: NextRequest): Promise<{ uid: string; email: string }>{
  const authz = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) throw new Error("No token");
  const decoded = await getAuth().verifyIdToken(token);
  const email = (decoded.email || "").toLowerCase();
  if (!email || (ALLOW.length > 0 && !ALLOW.includes(email))) throw new Error("Forbidden");
  return { uid: decoded.uid, email };
}

