"use client";

import { useEffect, useState } from "react";
import AgentLandingInfo from "@/components/AgentLandingInfo";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function AgentConsole() {
  const auth = getAuth();
  const db = getFirestore();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("-");
  const [translateUnlimited, setTranslateUnlimited] = useState<boolean | null>(null);
  const [draftOrgId, setDraftOrgId] = useState<string>("");
  const showSwitcher = !activeOrgId || process.env.NODE_ENV !== "production";

  // Resolve active org from ?org=, stored preference, or entitlement mapping
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const current = new URL(window.location.href);
      const queryOrg = current.searchParams.get("org");
      if (queryOrg) {
        const trimmed = queryOrg.trim();
        setActiveOrgId(trimmed);
        localStorage.setItem("activeOrgId", trimmed);
        return;
      }

      const stored = localStorage.getItem("activeOrgId");
      if (stored) {
        setActiveOrgId(stored);
        return;
      }

      const email = auth.currentUser?.email?.toLowerCase() || "";
      if (!email) return;
      const entitlement = await getDoc(doc(db, "entitlements", email));
      const mapped = entitlement.exists() ? ((entitlement.data() as any)?.orgId || null) : null;
      setActiveOrgId(mapped);
      if (mapped) localStorage.setItem("activeOrgId", mapped);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the manual org switcher input in sync
  useEffect(() => {
    setDraftOrgId(activeOrgId || "");
  }, [activeOrgId]);

  // Load org metadata when the active org changes
  useEffect(() => {
    (async () => {
      if (!activeOrgId) {
        setOrgName("-");
        setTranslateUnlimited(null);
        return;
      }
      const snap = await getDoc(doc(db, "orgs", activeOrgId));
      if (snap.exists()) {
        const data = snap.data() as any;
        setOrgName(data?.name || activeOrgId);
        setTranslateUnlimited(Boolean(data?.features?.translateUnlimited));
      } else {
        setOrgName(activeOrgId);
        setTranslateUnlimited(null);
      }
    })();
  }, [activeOrgId, db]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[agent] entitlement activeOrgId:", activeOrgId);
    }
  }, [activeOrgId]);

  async function startNewSession() {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ activeOrgId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload?.error || "create_failed");
      return;
    }
    window.location.href = `/agent/s/${payload.code}`;
  }

  function commitOrg(nextId: string) {
    const trimmed = nextId.trim();
    setActiveOrgId(trimmed || null);
    if (trimmed) localStorage.setItem("activeOrgId", trimmed);
    else localStorage.removeItem("activeOrgId");
  }

  const accountEmail = auth.currentUser?.email || "-";
  const planLabel = translateUnlimited ? "Translate Unlimited" : "-";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-zinc-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-xl font-semibold">EOV6 {"\u2014"} Agent Console</h1>
          <p className="text-xs opacity-80">Start a new session and share the 6-digit code with the caller.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <button className="button-primary" onClick={startNewSession}>
          Start a new session
        </button>

        <div className="card p-4">
          <h3 className="font-medium mb-2">Account</h3>
          <div className="text-sm text-zinc-700 flex flex-wrap gap-4">
            <div>Signed in as: <b>{accountEmail}</b></div>
            <div>Organization: <b>{orgName}</b></div>
            <div>Plan: <b>{planLabel}</b></div>
          </div>
        </div>

        {showSwitcher && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <input
              className="rounded border px-2 py-1"
              placeholder="Set active orgId"
              value={draftOrgId}
              onChange={(e) => setDraftOrgId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitOrg((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              className="button-ghost"
              onClick={() => {
                setDraftOrgId("");
                commitOrg("");
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="mt-6">
          <AgentLandingInfo />
        </div>
      </div>
    </div>
  );
}

