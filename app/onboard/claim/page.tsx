"use client";
import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

export default function ClaimPage() {
  const auth = getAuth();
  const [status, setStatus] = useState<string>("Ready");

  useEffect(() => {
    const url = new URL(window.location.href);
    const org = url.searchParams.get("org");
    if (!org) {
      setStatus("Missing org");
      return;
    }

    let cancelled = false;
    let done = false;

    const exec = async () => {
      if (done || !auth.currentUser) return;
      done = true;
      setStatus("Claiming...");
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/orgs/claim", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: org }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload?.error || "claim_failed");
        return;
      }
      if (cancelled) return;
      try {
        localStorage.setItem("activeOrgId", org);
      } catch {
        // ignore storage errors
      }
      window.location.href = "/thanks/setup?org=" + encodeURIComponent(org);
    };

    exec();
    const off = auth.onAuthStateChanged(() => exec());
    return () => {
      cancelled = true;
      off();
    };
  }, [auth]);

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Claim invitation</h1>
      <p className="mb-4">{status}</p>
      {!auth.currentUser && (
        <button
          className="button-primary"
          onClick={() => signInWithRedirect(auth, new GoogleAuthProvider())}
        >
          Sign in to continue
        </button>
      )}
    </div>
  );
}
