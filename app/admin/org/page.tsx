"use client";

import { useEffect, useMemo, useState } from "react";
import OrgTabs, { OrgTabKey } from "@/components/admin/org/OrgTabs";
import OrgGeneral from "@/components/admin/org/OrgGeneral";
import OrgStaff from "@/components/admin/org/OrgStaff";
import OrgFeatures from "@/components/admin/org/OrgFeatures";
import OrgBilling from "@/components/admin/org/OrgBilling";
import OrgUsage from "@/components/admin/org/OrgUsage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types/org";
import { resolveOrgIdFromEmail } from "@/lib/org-resolver";

export default function AdminOrgPage() {
  const [tab, setTab] = useState<OrgTabKey>("general");
  const [org, setOrg] = useState<Org | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, async (user) => {
      setError(null);
      if (!user) {
        setRole(null);
        setOrg(null);
        setOrgId("");
        setLoading(false);
        return;
      }

      setLoading(true);

      let resolvedOrgId =
        process.env.NODE_ENV === "development"
          ? "fivebyte"
          : user.email
          ? resolveOrgIdFromEmail(user.email)
          : "default";

      try {
        const tok = await user.getIdToken();
        const res = await fetch("/api/admin/ensure-membership", {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` }
        });
        const data = await res.json().catch(() => ({}));
        if (data?.role) {
          setRole(String(data.role));
        } else {
          setRole(null);
        }
        if (data?.orgId) {
          resolvedOrgId = String(data.orgId);
        }
      } catch {
        setRole(null);
      }

      setOrg(null);
      setOrgId(resolvedOrgId);
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const ref = doc(db, "orgs", orgId);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (snap.exists()) {
          setOrg({ id: orgId, ...(snap.data() as Omit<Org, "id">) });
          setError(null);
        } else {
          const currentUserEmail = getAuth().currentUser?.email;
          setOrg({
            id: orgId,
            name: orgId.toUpperCase(),
            domains: [],
            admins: currentUserEmail ? [currentUserEmail] : [],
            features: { allowUploads: false, translateUnlimited: false },
            texts: { privacyStatement: "", ackTemplate: "" },
            billing: { plan: "starter", stripeCustomerId: "" },
            users: currentUserEmail ? [currentUserEmail] : []
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold">Organisation Settings</h1>
          <p className="text-sm text-slate-500">Manage org profile, staff, features, billing and usage.</p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>
            Org ID: <span className="font-mono">{orgId || ""}</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full border ${
              role === "owner"
                ? "border-green-600 text-green-700"
                : role === "admin"
                ? "border-blue-600 text-blue-700"
                : "border-slate-300 text-slate-500"
            }`}
          >
            {role || "--"}
          </span>
        </div>
      </div>
    ),
    [orgId, role]
  );

  if (loading) return <div className="p-6">Loading org...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!org) return <div className="p-6">No organisation found.</div>;
  const canManage = role === "owner" || role === "admin";

  return (
    <div className="max-w-5xl mx-auto">
      {header}
      <OrgTabs current={tab} onChange={setTab} />
      <div className="p-4">
        {tab === "general" && <OrgGeneral orgId={orgId} org={org} onSaved={setOrg} canManage={canManage} />}
        {tab === "staff" && <OrgStaff orgId={orgId} org={org} onSaved={setOrg} canManage={canManage} />}
        {tab === "features" && <OrgFeatures orgId={orgId} org={org} onSaved={setOrg} canManage={canManage} />}
        {tab === "billing" && <OrgBilling orgId={orgId} org={org} onSaved={setOrg} canManage={canManage} />}
        {tab === "usage" && <OrgUsage orgId={orgId} />}
      </div>
    </div>
  );
}

