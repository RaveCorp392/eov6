/* eslint-disable react/no-unescaped-entities */
"use client";
import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import MyOrgButton from "@/components/MyOrgButton";

type Summary = { plan?: string; cycle?: string; seats?: number; translate?: boolean };

export default function ThanksPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  async function claimOrg() {
    try {
      const t = await getAuth().currentUser?.getIdToken();
      if (!t) {
        alert("Please sign in with the payer email first.");
        return;
      }
      const r = await fetch("/api/orgs/claim", {
        method: "POST",
        headers: { authorization: `Bearer ${t}` },
      });
      if (r.ok) {
        window.location.href = "/portal/organizations";
      } else {
        const j = await r.json().catch(() => ({}));
        alert("Claim failed: " + (j?.error || r.status));
      }
    } catch (e: any) {
      alert("Claim error: " + (e?.message || e));
    }
  }

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session_id");
    if (!sid) return;
    fetch(`/api/checkout/summary?session_id=${encodeURIComponent(sid)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => setSummary(j))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-bold mb-3">You're all set {String.fromCodePoint(0x1F389)}</h1>
      <p className="text-zinc-700 mb-6">Thanks for subscribing. Next steps are below&mdash;this takes 2 minutes.</p>

      {summary && (
        <div className="rounded-2xl border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">Your plan</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Plan: {summary.plan}</li>
            <li>Cycle: {summary.cycle}</li>
            <li>Seats: {summary.seats}</li>
            <li>Translate: {summary.translate ? "Yes" : "No"}</li>
          </ul>
        </div>
      )}

      <div className="rounded-2xl border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-3">1) Add your users</h2>
        <ol className="list-decimal ml-5 space-y-2 text-zinc-800">
          <li>
            Open <a className="text-blue-600 underline" href="/portal/organizations">Portal &rarr; Organizations</a>.
          </li>
          <li>
            Click your org &rarr; <strong>Resolve owner</strong> if prompted.
          </li>
          <li>
            Add teammates under <strong>Members</strong> (up to your purchased seats).
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-3">2) Set Privacy &amp; Acknowledgements</h2>
        <ol className="list-decimal ml-5 space-y-2 text-zinc-800">
          <li>
            In your org settings, paste your <strong>Privacy statement</strong>.
          </li>
          <li>
            Add acknowledgement templates (title + body). Mark any as <strong>Required</strong>.
          </li>
          <li>Callers will see these as a modal; decisions are logged inline in the session.</li>
        </ol>
      </div>

      <div className="rounded-2xl border p-6 mb-8 bg-amber-50">
        <h2 className="text-lg font-semibold mb-2">Why this matters</h2>
        <p className="text-amber-900">
          76% of customers won't reuse a service after one bad support interaction. Getting acknowledgements right helps
          prevent that one bad call.
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={claimOrg} className="rounded-xl bg-blue-600 text-white px-4 py-2">
          Claim ownership
        </button>
        <a href="/portal/organizations" className="rounded-xl border px-4 py-2">
          Open Portal
        </a>
        <MyOrgButton />
        <a href="https://agent.eov6.com/agent" className="rounded-xl border px-4 py-2">
          Open Agent
        </a>
      </div>
    </div>
  );
}

