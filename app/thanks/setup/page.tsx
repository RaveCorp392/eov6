"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ThanksSetupPage() {
  const [activeOrgId, setActiveOrgId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);
    const fromQuery = (current.searchParams.get("org") || "").trim();
    const lastCreated = window.localStorage.getItem("lastCreatedOrgId") || "";
    const next = fromQuery || lastCreated || "";

    if (fromQuery) {
      window.localStorage.setItem("lastCreatedOrgId", fromQuery);
    }
    if (next) {
      window.localStorage.setItem("activeOrgId", next);
    }
    setActiveOrgId(next);
  }, []);

  const agentHref = activeOrgId
    ? `https://agent.eov6.com?org=${encodeURIComponent(activeOrgId)}`
    : "https://agent.eov6.com";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{"You're all set \u{1F389}"}</h1>
      <p className="text-zinc-600 mb-6">{"Setup complete. Here's how it works from here."}</p>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold mb-2">What you can do next</h2>
        <ul className="list-disc ml-5 text-zinc-700">
          <li>Open the Agent console to start a session and share the 6-digit code with callers.</li>
          <li>Use your Portal to invite teammates or adjust privacy / acknowledgement text anytime.</li>
          <li>Translate Unlimited stays enabled if your plan includes it.</li>
        </ul>

        <div className="mt-4 flex items-center gap-3">
          <Link href={agentHref} className="button-primary">
            Open Agent Console
          </Link>
          <Link href="/portal/organizations" className="button-ghost">
            Open Portal
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 text-amber-900 p-5">
        <h3 className="font-semibold mb-1">Why this matters</h3>
        <p className="text-sm">
          76% of customers won{'\''}t reuse a service after one bad support interaction. Getting acknowledgements right helps prevent that one bad call.
        </p>
      </div>
    </div>
  );
}

