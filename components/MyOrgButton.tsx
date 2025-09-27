"use client";

import "@/lib/firebase";
import { getAuth } from "firebase/auth";

export default function MyOrgButton({ toAdminIfStaff = false }: { toAdminIfStaff?: boolean }) {
  async function open() {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Please sign in first.");
        return;
      }

      const res = await fetch("/api/me/org", { headers: { authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "lookup_failed");
      if (!data?.orgId) {
        alert("No organization found for your login yet.");
        return;
      }

      const email = (auth.currentUser?.email || "").toLowerCase();
      const allow = (process.env.NEXT_PUBLIC_INTERNAL_ADMINS || "")
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const domain = (process.env.NEXT_PUBLIC_INTERNAL_DOMAIN || "").toLowerCase();
      const isStaff = Boolean(email && (allow.includes(email) || (domain && email.endsWith(`@${domain}`))));

      const url = isStaff && toAdminIfStaff ? "/admin/organizations" : "/portal/organizations";
      window.location.href = url;
    } catch (e: any) {
      alert("Open My Org failed: " + (e?.message || e));
    }
  }

  return (
    <button onClick={open} className="rounded-xl border px-4 py-2">
      Open My Org
    </button>
  );
}
