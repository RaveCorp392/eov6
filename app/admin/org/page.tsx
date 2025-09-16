"use client";

import { useEffect, useMemo, useState } from "react";
import OrgTabs, { OrgTabKey } from "@/components/admin/org/OrgTabs";
import OrgGeneral from "@/components/admin/org/OrgGeneral";
import OrgStaff from "@/components/admin/org/OrgStaff";
import OrgFeatures from "@/components/admin/org/OrgFeatures";
import OrgBilling from "@/components/admin/org/OrgBilling";
import OrgUsage from "@/components/admin/org/OrgUsage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types/org";

export default function AdminOrgPage() {
  const [tab, setTab] = useState<OrgTabKey>("general");
  const [org, setOrg] = useState<Org | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        let resolvedOrgId = "default";
        if (user?.email) {
          const domain = user.email.split("@")[1]?.toLowerCase();
          if (domain) {
            const q = query(collection(db, "orgs"), where("domains", "array-contains", domain));
            const snap = await getDocs(q);
            if (!snap.empty) {
              resolvedOrgId = snap.docs[0].id;
            }
          }
        }
        const ref = doc(db, "orgs", resolvedOrgId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setOrgId(resolvedOrgId);
          setOrg({ id: resolvedOrgId, ...(snap.data() as Omit<Org, "id">) });
        } else {
          setOrgId(resolvedOrgId);
          setOrg({
            id: resolvedOrgId,
            name: resolvedOrgId.toUpperCase(),
            domains: [],
            admins: user?.email ? [user.email] : [],
            features: { allowUploads: false, translateUnlimited: false },
            texts: { privacyStatement: "", ackTemplate: "" },
            billing: { plan: "starter", stripeCustomerId: "" },
            users: user?.email ? [user.email] : [],
          });
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    });
    return () => off();
  }, []);

  const header = useMemo(() => (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div>
        <h1 className="text-xl font-semibold">Organisation Settings</h1>
        <p className="text-sm text-slate-500">Manage org profile, staff, features, billing and usage.</p>
      </div>
      <div className="text-xs text-slate-500">Org ID: <span className="font-mono">{orgId || ""}</span></div>
    </div>
  ), [orgId]);

  if (loading) return <div className="p-6">Loading org…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!org) return <div className="p-6">No organisation found.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      {header}
      <OrgTabs current={tab} onChange={setTab} />
      <div className="p-4">
        {tab === "general" && <OrgGeneral orgId={orgId} org={org} onSaved={setOrg} />}
        {tab === "staff" && <OrgStaff orgId={orgId} org={org} onSaved={setOrg} />}
        {tab === "features" && <OrgFeatures orgId={orgId} org={org} onSaved={setOrg} />}
        {tab === "billing" && <OrgBilling orgId={orgId} org={org} onSaved={setOrg} />}
        {tab === "usage" && <OrgUsage orgId={orgId} />}
      </div>
    </div>
  );
}

