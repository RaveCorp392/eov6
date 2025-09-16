"use client";

import React, { useMemo, useState } from "react";
import RoiLeadCalc from "@/components/roi/RoiLeadCalc";
import Link from "next/link";

type Interval = "monthly" | "yearly";

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

function calcMonthlyTotal(plan: "solo" | "team", includeTranslate: boolean): number {
  const base = plan === "solo" ? BASE.solo : BASE.team;
  const seats = plan === "solo" ? 1 : TEAM_SEATS;
  const translateAdd = includeTranslate ? TRANSLATE_PER_SEAT * seats : 0;
  return base + translateAdd;
}

function applyInterval(totalMonthly: number, interval: Interval): number {
  if (interval === "monthly") return totalMonthly;
  // For yearly, show the discounted per-month equivalent (“billed annually” elsewhere)
  return totalMonthly * YEARLY_FACTOR;
}

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");
  // Per-plan toggles so customers can see pricing with or without Translate.
  const [soloTranslate, setSoloTranslate] = useState(false);
  const [teamTranslate, setTeamTranslate] = useState(false);

  const soloPrice = useMemo(() => {
    const m = calcMonthlyTotal("solo", soloTranslate);
    return applyInterval(m, interval);
  }, [interval, soloTranslate]);

  const teamPrice = useMemo(() => {
    const m = calcMonthlyTotal("team", teamTranslate);
    return applyInterval(m, interval);
  }, [interval, teamTranslate]);

  const soloHref = useMemo(() => {
    const translate = soloTranslate ? 1 : 0;
    const seats = 1;
    return `/api/checkout?plan=solo&interval=${interval}&seats=${seats}&translate=${translate}`;
  }, [interval, soloTranslate]);

  const teamHref = useMemo(() => {
    const translate = teamTranslate ? 1 : 0;
    const seats = TEAM_SEATS;
    return `/api/checkout?plan=team&interval=${interval}&seats=${seats}&translate=${translate}`;
  }, [interval, teamTranslate]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <section className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Simple, honest pricing</h1>
        <p className="mt-2 text-slate-600">Start small, add seats or Translate when you need it.</p>

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
            <li>• Chat, file upload, acknowledgements</li>
            <li>• 1 user seat</li>
            <li>• Email support</li>
          </ul>

          <Link
            href={soloHref}
            className="mt-6 inline-flex w-full justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800"
          >
            {interval === "yearly" ? "Start yearly" : "Start monthly"}
          </Link>
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

          <Link
            href={teamHref}
            className="mt-6 inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700"
          >
            {interval === "yearly" ? "Start yearly" : "Start monthly"}
          </Link>
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

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-medium">What’s included in the base price?</h3>
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
              We keep pricing low and flexible. If something isn’t right in your first 14 days, reach out and
              we’ll make it right.
            </p>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <p className="mt-8 text-xs text-slate-500">
        Prices shown are in USD. Taxes may apply. “Accepted translation” means a translation that is committed to
        a chat (not just previewed).
      </p>
    </main>
  );
}

