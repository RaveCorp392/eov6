"use client";
import { useEffect, useState } from "react";
import "@/lib/firebase";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";

export default function ClaimPage() {
  const auth = getAuth();
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const org = url?.searchParams.get("org") || "";
  const token = url?.searchParams.get("token") || "";
  const [status, setStatus] = useState<string>(() => {
    if (!token) return "Missing token";
    if (!org) return "Missing org";
    return "Ready";
  });

  // After Google redirects back, this fires once
  useEffect(() => {
    (async () => {
      try {
        await getRedirectResult(auth); // resolves silently if no redirect
      } catch (_) {
        // ignore
      }
    })();
  }, [auth]);

  // When auth state changes, attempt the claim automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return; // not signed in yet
      if (!org || !token) {
        setStatus(!org ? "Missing org" : "Missing token");
        return;
      }

      try {
        setStatus("Claiming...");
        const t = await user.getIdToken();
        const r = await fetch("/api/orgs/claim", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
          body: JSON.stringify({ orgId: org, token }),
        });
        const j = await r.json();
        if (!r.ok) {
          setStatus(j?.error || "claim_failed");
          return;
        }

        // success -> store and bounce to setup
        const activeOrgId = (j?.orgId as string) || org;
        localStorage.setItem("activeOrgId", activeOrgId);
        window.location.replace(`/thanks/setup?org=${encodeURIComponent(activeOrgId)}`);
      } catch (e: any) {
        setStatus(e?.message || "claim_failed");
      }
    });
    return () => unsub();
  }, [auth, org, token]);

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Claim invitation</h1>
      <p className="mb-4">{status}</p>

      {!auth.currentUser && (
        <>
          <button
            className="button-primary"
            onClick={() => signInWithRedirect(auth, new GoogleAuthProvider())}
          >
            Sign in to continue
          </button>
          <div className="text-xs text-zinc-500 mt-2">
            Not you?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                auth.signOut().then(() => window.location.reload());
              }}
            >
              Sign in with a different account
            </a>
          </div>
        </>
      )}
    </div>
  );
}
