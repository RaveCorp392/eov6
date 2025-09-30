"use client";

import { useEffect, useState } from "react";
import OrgTabs, { OrgTabKey } from "@/components/admin/org/OrgTabs";
import OrgGeneral from "@/components/admin/org/OrgGeneral";
import OrgStaff from "@/components/admin/org/OrgStaff";
import OrgFeatures from "@/components/admin/org/OrgFeatures";
import OrgBilling from "@/components/admin/org/OrgBilling";
import OrgUsage from "@/components/admin/org/OrgUsage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { resolveOrgIdFromEmail } from "@/lib/org-resolver";
import { OrgDoc } from "@/lib/org-types";

export default function AdminOrgPage() {
  const auth = getAuth();
  const db = getFirestore();

  const [tab, setTab] = useState<OrgTabKey>("general");
  const [org, setOrg] = useState<Partial<OrgDoc> | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  async function loadOrg(id: string) {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "orgs", id));
      if (snap.exists()) {
        setOrg({ id: snap.id, ...(snap.data() as any) } as Partial<OrgDoc>);
        setError(null);
      } else {
        setOrg(null);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function resolveOwner() {
    if (!orgId) return;
    try {
      setResolving(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("no_token");
      const res = await fetch("/api/orgs/resolve-owner", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText);
      await loadOrg(orgId);
    } catch (e: any) {
      alert(e?.message || "resolve_failed");
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setError(null);
      if (!user) {
        setRole(null);
        setOrg(null);
        setOrgId("");
        setCurrentEmail(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const email = user.email?.toLowerCase() || "";
      setCurrentEmail(email || null);

      let resolvedOrgId = email ? resolveOrgIdFromEmail(email) : "";
      if (!resolvedOrgId) resolvedOrgId = "default";

      try {
        const tok = await user.getIdToken();
        const res = await fetch("/api/admin/ensure-membership", {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
        });
        const data = await res.json().catch(() => ({}));
        setRole(data?.role ? String(data.role) : null);
        if (data?.orgId) resolvedOrgId = String(data.orgId);
      } catch {
        setRole(null);
      }

      setOrg(null);
      setOrgId(resolvedOrgId);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (orgId) void loadOrg(orgId);
  }, [orgId]);

  const myEmail = (currentEmail || "").toLowerCase();
  const ownerEmail = (org?.ownerEmail || "").toLowerCase();
  const pendingOwnerEmail = (org?.pendingOwnerEmail || "").toLowerCase();
  const canResolve = !!orgId && !ownerEmail && (!pendingOwnerEmail || pendingOwnerEmail === myEmail);

  if (loading) return <div className="p-6">Loading org...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!org) return <div className="p-6">No organisation found.</div>;

  const header = (
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
        {canResolve && (
          <button type="button" className="button-ghost" onClick={resolveOwner} disabled={resolving}>
            {resolving ? "Resolving..." : "Resolve owner"}
          </button>
        )}
      </div>
    </div>
  );

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="max-w-5xl mx-auto">
      {header}
      <OrgTabs current={tab} onChange={setTab} />
      <div className="p-4">
        {tab === "general" && <OrgGeneral orgId={orgId} org={org} onSaved={(next) => setOrg(next)} canManage={canManage} />}
        {tab === "staff" && <OrgStaff orgId={orgId} org={org} onSaved={(next) => setOrg(next)} canManage={canManage} />}
        {tab === "features" && <OrgFeatures orgId={orgId} org={org} onSaved={(next) => setOrg(next)} canManage={canManage} />}
        {tab === "billing" && <OrgBilling orgId={orgId} org={org} onSaved={(next) => setOrg(next)} canManage={canManage} />}
        {tab === "usage" && <OrgUsage orgId={orgId} />}
      </div>
    </div>
  );
}

