"use client";

import { getAuth } from "firebase/auth";

export async function ensureMembership(): Promise<{ ok: boolean; role?: string; orgId?: string; status: number }>{
  const user = getAuth().currentUser;
  if (!user) return { ok: false, status: 401 };
  const idToken = await user.getIdToken();
  const res = await fetch("/api/admin/ensure-membership", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, role: data?.role, orgId: data?.orgId };
}

