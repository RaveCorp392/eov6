"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
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
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res?.user?.email) {
          setSignedInEmail(res.user.email);
          setStatus("Signed in; ready to claim");
        }
      } catch (err) {
        console.warn("[claim:getRedirectResult] failed", err);
      }
    })();
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
      setStatus("Claiming\u2026");
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
      console.error("[claim:claim] error", e);
    }
  }

  function signIn() {
    try {
      setStatus("Opening redirect\u2026");
      signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (e: any) {
      setStatus(e?.message || "auth_failed");
      console.error("[claim:redirect] error", e);
    }
  }

  async function signInWithPopupFallback() {
    try {
      setStatus("Opening popup\u2026");
      await signInWithPopup(auth, new GoogleAuthProvider());
      setStatus("Signed in; ready to claim");
    } catch (e: any) {
      setStatus(e?.message || "popup_failed");
      console.error("[claim:popup] error", e);
    }
  }

  function signOutAndReload() {
    auth.signOut().then(() => window.location.reload());
  }

  function switchAccountLink(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    signOutAndReload();
  }

  function switchAccountButton(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    signOutAndReload();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Claim invitation</h1>
      <div className="text-sm text-zinc-700 mb-4">
        <div>Token: <b>{token || "\u2014"}</b></div>
        <div>Org: <b>{orgId || "\u2014"}</b></div>
        <div>Signed in as: <b>{signedInEmail || "\u2014"}</b></div>
      </div>

      <p className="mb-2">{status}</p>

      {!auth.currentUser ? (
        <>
          <div>
            <button className="button-primary" onClick={signIn}>Sign in to continue</button>
            <button className="button-ghost ml-2" onClick={signInWithPopupFallback}>Try popup sign-in</button>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            If you just signed in and still see &ldquo;Ready&rdquo;, allow third-party cookies for accounts.google.com in Incognito, or try a normal window.
          </div>
          <div className="text-xs text-zinc-500">
            Not you? <a href="#" onClick={switchAccountLink}>Sign in with a different account</a>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button className="button-primary" onClick={doClaim}>
            Claim now
          </button>
          <button className="button-ghost" onClick={switchAccountButton}>
            Switch account
          </button>
        </div>
      )}

      {dbg && (
        <div className="mt-6 rounded border bg-zinc-50 p-3 text-xs text-zinc-700">
          <div>
            <b>Debug</b>
          </div>
          <div>token: {token || "\u2014"}</div>
          <div>org: {orgId || "\u2014"}</div>
          <div>signedIn: {signedInEmail || "\u2014"}</div>
          <div>status: {status}</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(lastResp, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
