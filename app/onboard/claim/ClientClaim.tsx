'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

export default function ClientClaim() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const orgId = searchParams?.get("org") ?? "";
  const dbg = searchParams?.get("debug") === "1";

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
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch("/api/orgs/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token, org: orgId }),
      });
      const data = await response.json().catch(() => ({}));
      setLastResp({ ok: response.ok, body: data });

      if (!response.ok || !data?.ok) {
        const reason = data?.code || data?.error || response.statusText || "claim_failed";
        setStatus(reason);
        alert(`Claim failed: ${reason}`);
        return;
      }

      const resolvedOrg = data?.orgId || orgId;
      try {
        localStorage.setItem("activeOrgId", resolvedOrg);
      } catch {
        // ignore storage write failures
      }
      setStatus("Claim successful — redirecting...");
      window.location.replace(`/thanks/setup?org=${encodeURIComponent(resolvedOrg)}`);
    } catch (e: any) {
      setStatus(e?.message || "claim_failed");
      console.error("[claim:claim] error", e);
      alert("Claim failed: network_error");
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

  function handleGetStarted() {
    if (!auth.currentUser) {
      void signInWithPopupFallback();
      return;
    }
    void doClaim();
  }

  function switchAccount(e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    e.preventDefault();
    auth.signOut().then(() => window.location.reload());
  }

  const signedIn = Boolean(auth.currentUser);

  return (
    <main className="min-h-[100svh] bg-slate-50 text-slate-900 flex items-center">
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6" data-debug={dbg ? "1" : "0"}>
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="EOV6" width={28} height={28} className="rounded" />
            <span className="font-semibold tracking-tight">EOV6</span>
          </div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Help
          </Link>
        </header>

        {/* Card */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Claim your invite</h1>
          <p className="mt-2 text-slate-600">
            Sign in with a quick popup, then we&apos;ll finish setting up your access.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
            <li>Popup-only sign-in (Incognito-friendly)</li>
            <li>Your domain is added to the organization automatically</li>
            <li>Data is ephemeral by default</li>
          </ul>

          {/* CTA row */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              id="claimGetStarted"
              type="button"
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-5 py-3 text-sm font-medium hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
            >
              Get started
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-white text-slate-700 px-5 py-3 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Back to home
            </Link>
          </div>

          <div className="mt-6 rounded-xl bg-slate-900/5 p-4 ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-700" aria-live="polite">
              {status}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>Signed in as: {signedInEmail || "-"}</span>
              {signedIn && (
                <button
                  type="button"
                  onClick={switchAccount}
                  className="inline-flex items-center rounded-lg px-2 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60"
                >
                  Switch account
                </button>
              )}
            </div>
          </div>

          {/* Debug hint (kept, but hidden unless ?debug=1) */}
          <div className="mt-4 text-xs text-slate-400 hidden data-[debug='1']:block" id="claimDebugHint">
            Debug info is enabled.
            <div className="mt-2 space-y-1 text-slate-500">
              <div>token: {token || "-"}</div>
              <div>org: {orgId || "-"}</div>
              <div>signedIn: {signedInEmail || "-"}</div>
              <div>status: {status}</div>
            </div>
            {lastResp && (
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-slate-900/5 p-3 text-[10px] text-slate-500">
                {JSON.stringify(lastResp, null, 2)}
              </pre>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-xs text-slate-500">Clarity at every call.</footer>
      </div>
    </main>
  );
}
