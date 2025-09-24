"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Client-only ROI widget to avoid server/client number formatting mismatches
const RoiLeadCalc = dynamic(() => import("@/components/roi/RoiLeadCalc"), { ssr: false });

type Plan = "solo" | "team";
type Interval = "monthly" | "yearly";

type CheckoutPayload = {
  plan: Plan;
  interval: Interval;
  seats: number;
  translate: boolean;
};

const TEAM_SEATS = 5;

// Base monthly totals (not per-seat) for each plan without Translate.
const BASE = {
  solo: 5,   // $5 / mo (1 seat)
  team: 25,  // $25 / mo (5 seats)
};

// Translate add-on cost per seat (monthly).
const TRANSLATE_PER_SEAT = 1;

// Yearly discount factor (20% off).
const YEARLY_FACTOR = 0.8;

function fmtUSD(n: number) {
  return `$${n.toFixed(n % 1 ? 2 : 0)}`;
}

function calcMonthlyTotal(plan: Plan, includeTranslate: boolean): number {
  const base = plan === "solo" ? BASE.solo : BASE.team;
  const seats = plan === "solo" ? 1 : TEAM_SEATS;
  const translateAdd = includeTranslate ? TRANSLATE_PER_SEAT * seats : 0;
  return base + translateAdd;
}

function applyInterval(totalMonthly: number, interval: Interval): number {
  if (interval === "monthly") return totalMonthly;
  return totalMonthly * YEARLY_FACTOR;
}

async function postCheckout(payload: CheckoutPayload) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || `checkout ${res.status}`);
  }
  window.location.href = data.url;
}

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");
  // Per-plan toggles so customers can see pricing with or without Translate.
  const [soloTranslate, setSoloTranslate] = useState(false);
  const [teamTranslate, setTeamTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function safe(fn: () => Promise<void>) {
    return async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      try {
        setBusy(true);
        setErr(null);
        await fn();
      } catch (ex: any) {
        setErr(ex?.message || "Checkout failed");
      } finally {
        setBusy(false);
      }
    };
  }

  const soloPrice = useMemo(() => {
    const m = calcMonthlyTotal("solo", soloTranslate);
    return applyInterval(m, interval);
  }, [interval, soloTranslate]);

  const teamPrice = useMemo(() => {
    const m = calcMonthlyTotal("team", teamTranslate);
    return applyInterval(m, interval);
  }, [interval, teamTranslate]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <section className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Simple, honest pricing</h1>
        <p className="mt-2 text-slate-600">Start small, add seats or Translate when you need it.</p>
        {err && (
          <div className="mx-auto mt-4 max-w-xl rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        )}
        {/* Interval toggle */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border px-1 py-1 bg-white shadow-sm">
          <button
            className={
              "px-4 py-1.5 rounded-full text-sm " +
              (interval === "monthly"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100")
            }
            onClick={() => setInterval("monthly")}
          >
            Monthly
          </button>
          <button
            className={
              "px-4 py-1.5 rounded-full text-sm " +
              (interval === "yearly"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100")
            }
            onClick={() => setInterval("yearly")}
          >
            Yearly <span className="ml-1 text-emerald-600">(20% off)</span>
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="grid gap-6 md:grid-cols-3">
        {/* Solo */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold">Solo</h3>
          <p className="text-sm text-slate-600">1 seat</p>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{fmtUSD(soloPrice)}</span>
            <span className="text-slate-500">/ mo{interval === "yearly" ? " (billed annually)" : ""}</span>
          </div>
          {/* Translate toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              id="solo-translate"
              type="checkbox"
              checked={soloTranslate}
              onChange={(e) => setSoloTranslate(e.target.checked)}
            />
            <label htmlFor="solo-translate" className="text-sm">
              Include Translate (+$1 / seat)
            </label>
          </div>
          {!soloTranslate && (
            <p className="mt-1 text-xs text-slate-500">
              Or pay-as-you-go at <strong>$1</strong> per accepted translation.
            </p>
          )}
          <ul className="mt-6 space-y-2 text-sm">
            <li>• Unlimited chat & file uploads</li>
            <li>• Caller acknowledgements</li>
            <li>• Essential admin</li>
          </ul>
          <button
            disabled={busy}
            onClick={safe(() =>
              postCheckout({
                plan: "solo",
                interval,
                seats: 1,
                translate: !!soloTranslate,
              })
            )}
            className="mt-6 inline-flex w-full justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {interval === "yearly" ? "Start yearly" : "Start monthly"}
          </button>
        </div>

        {/* Team (5 seats) */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm ring-2 ring-blue-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team</h3>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Popular</span>
          </div>
          <p className="text-sm text-slate-600">5 seats</p>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{fmtUSD(teamPrice)}</span>
            <span className="text-slate-500">/ mo{interval === "yearly" ? " (billed annually)" : ""}</span>
          </div>
          {/* Translate toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              id="team-translate"
              type="checkbox"
              checked={teamTranslate}
              onChange={(e) => setTeamTranslate(e.target.checked)}
            />
            <label htmlFor="team-translate" className="text-sm">
              Include Translate (+$1 / seat)
            </label>
          </div>
          {!teamTranslate && (
            <p className="mt-1 text-xs text-slate-500">
              Or pay-as-you-go at <strong>$1</strong> per accepted translation.
            </p>
          )}
          <ul className="mt-6 space-y-2 text-sm">
            <li>• Everything in Solo, plus</li>
            <li>• 5 user seats</li>
            <li>• Priority support</li>
          </ul>
          <button
            disabled={busy}
            onClick={safe(() =>
              postCheckout({
                plan: "team",
                interval,
                seats: TEAM_SEATS,
                translate: !!teamTranslate,
              })
            )}
            className="mt-6 inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {interval === "yearly" ? "Start yearly" : "Start monthly"}
          </button>
        </div>

        {/* Enterprise */}
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold">Enterprise</h3>
          <p className="text-sm text-slate-600">Custom seats & usage</p>
          <div className="mt-5 space-y-1 text-sm">
            <p>• Base: <strong>$3/seat</strong> (no Translate)</p>
            <p>• With Translate included: <strong>$5/seat</strong></p>
            <p>• Or Translate PAYG: <strong>$0.50</strong> per accepted translation</p>
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li>• SSO & advanced controls</li>
            <li>• Custom limits and SLAs</li>
            <li>• Dedicated support channel</li>
          </ul>
          <Link
            href="/contact"
            className="mt-6 inline-flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2.5 hover:bg-slate-50"
          >
            Contact sales
          </Link>
        </div>
      </section>

      {/* ROI anchor */}
      <section id="roi" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-semibold">See the savings for your center</h2>
        <p className="text-slate-600 mt-1">Play with the numbers. We can email you a copy.</p>
        <div className="mt-4">
          <RoiLeadCalc />
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-medium">What&#39;s included in the base price?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Chat, file uploads (images/PDF), caller acknowledgements, basic admin pages, and standard support.
            </p>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-medium">How does Translate billing work?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Include Translate for a flat <strong>$1 per seat</strong> monthly, or use PAYG at{" "}
              <strong>$1</strong> per accepted translation on Solo/Team. Enterprise can opt into{" "}
              <strong>$0.50</strong> per accepted translation.
            </p>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-medium">Can I switch between monthly and yearly?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Yes — you can change your billing interval at any time. Yearly gets a{" "}
              <strong>20% discount</strong> applied to the monthly equivalent, billed annually.
            </p>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-medium">Do you offer trials or refunds?</h3>
            <p className="mt-1 text-sm text-slate-600">
              We keep pricing low and flexible. If something isn&#39;t right in your first 14 days, reach out and we&#39;ll make it right.
            </p>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <p className="mt-8 text-xs text-slate-500">
        Prices shown are in USD. Taxes may apply. “Accepted translation” means a translation that is committed to a chat (not just previewed).
      </p>
    </main>
  );
}
