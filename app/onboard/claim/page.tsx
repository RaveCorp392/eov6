"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
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
  const [signedInEmail, setSignedInEmail] = useState<string>("");
  const [lastResp, setLastResp] = useState<any>(null);

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
      (err) => console.error("[claim:onAuthStateChanged] error", err),
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

      localStorage.setItem("activeOrgId", j.orgId || orgId);
      window.location.replace(`/thanks/setup?org=${encodeURIComponent(j.orgId || orgId)}`);
    } catch (e: any) {
      setStatus(e?.message || "claim_failed");
      console.error("[claim:claim] error", e);
    }
  }

  async function signInWithPopupFallback() {
    try {
      setStatus("Opening popup...");
      await signInWithPopup(auth, new GoogleAuthProvider());
      setStatus("Signed in; ready to claim");
    } catch (e: any) {
      setStatus(e?.message || "popup_failed");
      console.error("[claim:popup] error", e);
    }
  }

  function switchAccount(e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    e.preventDefault();
    auth.signOut().then(() => window.location.reload());
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">You&rsquo;re invited &mdash; let&rsquo;s get you set up</h1>

      <div className="text-sm text-zinc-700 mb-4">
        <div>Token: <b>{token || "-"}</b></div>
        <div>Org: <b>{orgId || "-"}</b></div>
        <div>Signed in as: <b>{signedInEmail || "-"}</b></div>
      </div>

      <p className="mb-2">{status}</p>

      {!auth.currentUser ? (
        <>
          <button className="button-primary" onClick={signInWithPopupFallback}>Sign in with Google</button>
          <div className="text-xs text-zinc-500 mt-2">
            If the popup is blocked, allow popups for this site.
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button className="button-primary" onClick={doClaim}>Get started</button>
          <button className="button-ghost" onClick={switchAccount}>Switch account</button>
        </div>
      )}

      {dbg && (
        <div className="mt-6 rounded border bg-zinc-50 p-3 text-xs text-zinc-700">
          <div><b>Debug</b></div>
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

