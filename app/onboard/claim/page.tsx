"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

export default function ClaimPage() {
  const url = useMemo(
    () => (typeof window !== "undefined" ? new URL(window.location.href) : null),
    [],
  );
  const token = url?.searchParams.get("token") || "";
  const orgId = url?.searchParams.get("org") || "";
  const dbg = url?.searchParams.get("debug") === "1";

  const [status, setStatus] = useState<string>(() =>
    !token ? "Missing token" : !orgId ? "Missing orgId" : "Ready",
  );
  const [lastResp, setLastResp] = useState<any>(null);
  const [signedInEmail, setSignedInEmail] = useState<string>("");

  useEffect(() => {
    try {
      void getRedirectResult(auth).catch(() => {});
    } catch (err) {
      console.error("[claim:init] getRedirectResult failed", err);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        setSignedInEmail(user?.email || "");
        if (user && token && orgId) {
          setStatus("Signed in; ready to claim");
        }
      },
      (error) => {
        console.error("[claim:onAuthStateChanged] error", error);
      },
    );
    return () => unsub();
  }, [token, orgId]);

  async function doClaim() {
    if (!token || !orgId) {
      setStatus("Missing token or orgId");
      return;
    }
    if (!auth.currentUser) {
      setStatus("Please sign in first");
      return;
    }

    try {
      setStatus("Claiming...");
      const t = await auth.currentUser.getIdToken();
      const r = await fetch("/api/orgs/claim", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
        body: JSON.stringify({ token, orgId }),
      });
      const j = await r.json().catch(() => ({}));
      setLastResp({ ok: r.ok, body: j });

      if (!r.ok || !j?.ok) {
        setStatus(j?.error || r.statusText || "claim_failed");
        return;
      }

      const targetOrg = (j?.orgId as string) || orgId;
      localStorage.setItem("activeOrgId", targetOrg);
      window.location.replace(`/thanks/setup?org=${encodeURIComponent(targetOrg)}`);
    } catch (e: any) {
      setStatus(e?.message || "claim_failed");
    }
  }

  function signIn() {
    try {
      signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (e: any) {
      setStatus(e?.message || "auth_failed");
    }
  }

  function switchAccount(e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    e.preventDefault();
    auth.signOut().then(() => window.location.reload());
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Claim invitation</h1>
      <div className="text-sm text-zinc-700 mb-4">
        <div>
          Token: <b>{token || "-"}</b>
        </div>
        <div>
          Org: <b>{orgId || "-"}</b>
        </div>
        <div>
          Signed in as: <b>{signedInEmail || "-"}</b>
        </div>
      </div>

      <p className="mb-4">{status}</p>

      {!auth.currentUser ? (
        <>
          <button className="button-primary" onClick={signIn}>
            Sign in to continue
          </button>
          {status === "Ready" && (
            <div className="text-xs text-zinc-500 mt-2">
              If you just signed in elsewhere and still see "Ready", allow third-party cookies for
              accounts.google.com or try a normal (non-incognito) window.
            </div>
          )}
          <div className="text-xs text-zinc-500 mt-2">
            Not you?{" "}
            <a href="#" onClick={switchAccount}>
              Sign in with a different account
            </a>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button className="button-primary" onClick={doClaim}>
            Claim now
          </button>
          <button className="button-ghost" onClick={switchAccount}>
            Switch account
          </button>
        </div>
      )}

      {dbg && (
        <div className="mt-6 rounded border bg-zinc-50 p-3 text-xs text-zinc-700">
          <div>
            <b>Debug</b>
          </div>
          <div>token: {token || "-"}</div>
          <div>org: {orgId || "-"}</div>
          <div>signedIn: {signedInEmail || "-"}</div>
          <div>status: {status}</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(lastResp, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
