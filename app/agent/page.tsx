"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AgentLandingInfo from "@/components/AgentLandingInfo";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { normalizeSlug } from "@/lib/slugify";

export default function AgentConsole() {

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("-");
  const [translateUnlimited, setTranslateUnlimited] = useState<boolean | null>(null);
  const [draftOrgId, setDraftOrgId] = useState<string>("");
  const showSwitcher = !activeOrgId || process.env.NODE_ENV !== "production";
  const searchParams = useSearchParams();
  const queryOrgParam = searchParams?.get("org");
  const lastJoinedOrgRef = useRef<string | null>(null);

  const joinOrg = useCallback(
    async (slug: string, { silent }: { silent?: boolean } = {}) => {
      const normalized = normalizeSlug(slug);
      if (!normalized) return false;
      if (silent && lastJoinedOrgRef.current === normalized) {
        return true;
      }
      if (typeof window === "undefined") {
        return false;
      }
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          if (silent) {
            return false;
          }
          try {
            await signInWithPopup(auth, new GoogleAuthProvider());
          } catch (popupError) {
            console.warn("[agent] sign-in popup failed", popupError);
            if (!silent) {
              alert("Unable to sign in to join the organization. Please try again.");
            }
            return false;
          }
          currentUser = auth.currentUser;
        }
        if (!currentUser) {
          if (!silent) {
            alert("Unable to join organization: no signed-in user.");
          }
          return false;
        }
        const idToken = await currentUser.getIdToken(true);
        const response = await fetch(`/api/orgs/join?org=${encodeURIComponent(normalized)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          const reason = payload?.code || response.statusText || "join_failed";
          console.warn("[agent] join failed", reason);
          if (!silent) {
            alert(`Unable to join organization: ${reason}`);
          }
          return false;
        }
        if (payload?.org?.name) {
          setOrgName(payload.org.name);
        }
        if (payload?.org?.features) {
          setTranslateUnlimited(Boolean(payload.org.features.translateUnlimited));
        }
        try {
          localStorage.setItem("activeOrgId", normalized);
          localStorage.setItem("active_org", normalized);
        } catch {
          // ignore storage issues
        }
        lastJoinedOrgRef.current = normalized;
        return true;
      } catch (error) {
        console.warn("[agent] join error", error);
        if (!silent) {
          alert("Unable to join organization due to a network error. Please try again.");
        }
        return false;
      }
    },
    [setOrgName, setTranslateUnlimited],
  );

  const commitOrg = useCallback(
    (nextId: string, options: { silent?: boolean } = {}) => {
      const normalized = normalizeSlug(nextId.trim());
      if (!normalized) {
        setActiveOrgId(null);
        try {
          localStorage.removeItem("activeOrgId");
          localStorage.removeItem("active_org");
        } catch {
          // ignore storage issues
        }
        lastJoinedOrgRef.current = null;
        return;
      }
      setActiveOrgId(normalized);
      try {
        localStorage.setItem("activeOrgId", normalized);
        localStorage.setItem("active_org", normalized);
      } catch {
        // ignore storage issues
      }
      void joinOrg(normalized, options);
    },
    [joinOrg],
  );

  // Resolve active org from ?org=, stored preference, or entitlement mapping
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (queryOrgParam) {
        commitOrg(queryOrgParam, { silent: true });
        return;
      }

      const stored =
        localStorage.getItem("activeOrgId") ?? localStorage.getItem("active_org");
      if (stored) {
        commitOrg(stored, { silent: true });
        return;
      }

      let mapped: string | null = null;

      try {
        const response = await fetch("/api/me/entitlement");
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (typeof data?.entitlement?.orgId === "string") {
            const normalized = normalizeSlug(data.entitlement.orgId);
            if (normalized) {
              mapped = normalized;
            }
          }
        }
      } catch (entitlementError) {
        console.warn("[agent] entitlement endpoint failed", entitlementError);
      }

      if (!mapped) {
        const email = auth.currentUser?.email?.toLowerCase() || "";
        if (email) {
          try {
            const entitlementSnap = await getDoc(doc(db, "entitlements", email));
            if (entitlementSnap.exists()) {
              const docData = entitlementSnap.data() as { orgId?: unknown };
              if (typeof docData?.orgId === "string") {
                const normalized = normalizeSlug(String(docData.orgId));
                if (normalized) {
                  mapped = normalized;
                }
              }
            }
          } catch (firestoreError) {
            console.warn("[agent] entitlement lookup failed", firestoreError);
          }
        }
      }

      if (mapped) {
        commitOrg(mapped, { silent: true });
      } else {
        setActiveOrgId(null);
        try {
          localStorage.removeItem("activeOrgId");
          localStorage.removeItem("active_org");
        } catch {
          // ignore storage issues
        }
        lastJoinedOrgRef.current = null;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrgParam]);

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
  }, [activeOrgId]);

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
                  commitOrg((e.target as HTMLInputElement).value, { silent: false });
                }
              }}
            />
            <button
              className="button-ghost"
              onClick={() => {
                setDraftOrgId("");
                commitOrg("", { silent: false });
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






