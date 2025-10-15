/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useMemo, useState } from "react";
import PricingFAQ from "@/components/pricing/FAQ";
import { auth, googleProvider, signInWithPopup } from "@/lib/firebase";
import { getUtmCookie } from "@/lib/utm";
import UtmCookieBoot from "@/app/_client/UtmCookieBoot";

type BillingCycle = "monthly" | "yearly";
type Plan = "solo" | "team5" | "enterprise" | "weekpass";

type CheckoutPayload = {
  plan: Plan;
  cycle?: BillingCycle;
  translate?: boolean;
  seats?: number;
};

function formatAUD(cents: number) {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100);
}

const PRICES = {
  solo: { monthly: 500, yearly: Math.round(500 * 12 * 0.8) },          // $5 -> ~$48
  translateSolo: { monthly: 100, yearly: Math.round(100 * 12 * 0.8) }, // $1 -> ~$9.6
  team5: { monthly: 2500, yearly: Math.round(2500 * 12 * 0.8) },       // $25 -> ~$240
  team5Translate: { monthly: 500, yearly: Math.round(500 * 12 * 0.8) },// $5 -> ~$48
  translateEnterprise: { monthly: 50 },                                 // $0.50 (monthly only)
  weekpass: 500,                                                        // $5 one-time
};

function useActiveOrgSlug() {
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("org");
      const stored = window.localStorage?.getItem("active_org") ?? "";
      setSlug((q || stored || "").toString());
    } catch {
      setSlug("");
    }
  }, []);

  return slug;
}

function TrialToggle({ defaultOn }: { defaultOn: boolean }) {
  const [trial, setTrial] = useState(defaultOn);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const org = useActiveOrgSlug();

  useEffect(() => {
    setTrial(defaultOn);
  }, [defaultOn]);

  const trialFeatureEnabled =
    (process.env.NEXT_PUBLIC_TRIAL_ENABLE ?? process.env.TRIAL_ENABLE ?? "0") === "1";

  if (!trialFeatureEnabled) return null;

  async function start(plan: "pro") {
    setErr(null);
    setBusy(true);
    try {
      if (!auth.currentUser) {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch {
          // ignore popup failures; we check auth state below
        }
      }
      const user = auth.currentUser;
      if (!user?.email) {
        setErr("sign_in_required");
        setBusy(false);
        return;
      }

      if (!org) {
        setBusy(false);
        window.location.href = "/onboard?return=/pricing&trial=1";
        return;
      }

      const utm = getUtmCookie() || undefined;

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org, email: user.email, plan, trial, utm }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) {
        setErr(data?.code || "checkout_error");
        setBusy(false);
        return;
      }

      window.location.href = data.url as string;
    } catch {
      setErr("network_error");
      setBusy(false);
    }
  }

  return (
    <div className="mt-12 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm md:text-base">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={trial}
            onChange={(event) => setTrial(event.target.checked)}
            disabled={busy}
          />
          Start with a 30-day free trial (auto converts)
        </label>
        <button
          onClick={() => void start("pro")}
          disabled={busy}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-white transition disabled:opacity-60"
        >
          {busy ? "Redirecting…" : trial ? "Start Trial" : "Subscribe"}
        </button>
      </div>
      {err && (
        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err === "sign_in_required"
            ? "Please sign in to continue."
            : err === "checkout_error"
              ? "Could not start checkout. Try again."
              : err === "network_error"
                ? "Network error. Please retry."
                : err}
        </div>
      )}
      {!org && (
        <div className="mt-2 text-xs text-slate-500">
          We’ll guide you through creating your org before billing.
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [trialDefault, setTrialDefault] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const trialQuery = url.searchParams.get("trial") === "1";
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      const hasUtmQuery = utmKeys.some((key) => !!url.searchParams.get(key));
      const cookie = getUtmCookie();
      setTrialDefault(trialQuery || hasUtmQuery || Boolean(cookie));
    } catch {
      setTrialDefault(false);
    }
  }, []);

  // Solo
  const [soloTranslate, setSoloTranslate] = useState(false);
  const soloTotal = useMemo(() => {
    const base = PRICES.solo[cycle === "yearly" ? "yearly" : "monthly"];
    const add = soloTranslate ? PRICES.translateSolo[cycle === "yearly" ? "yearly" : "monthly"] : 0;
    return base + add;
  }, [cycle, soloTranslate]);

  // Team5
  const [teamTranslate, setTeamTranslate] = useState(false);
  const teamTotal = useMemo(() => {
    const base = PRICES.team5[cycle === "yearly" ? "yearly" : "monthly"];
    const add = teamTranslate ? PRICES.team5Translate[cycle === "yearly" ? "yearly" : "monthly"] : 0;
    return base + add;
  }, [cycle, teamTranslate]);

  // Enterprise 6-100 (monthly only)
  const [enterpriseTranslate, setEnterpriseTranslate] = useState(true);
  const [seats, setSeats] = useState(30);
  const over = seats > 100;
  const under = seats < 6;

  const enterpriseTotal = useMemo(() => {
    const s = Math.max(0, Math.min(seats || 0, 100));
    const basePerSeat = 300; // $3.00 in cents
    const translatePerSeat = enterpriseTranslate ? PRICES.translateEnterprise.monthly : 0; // $0.50 in cents
    return s * (basePerSeat + translatePerSeat);
  }, [seats, enterpriseTranslate]);

  const enterpriseBasePerSeat = 3.0;
  const enterpriseTranslatePerSeat = 0.5;
  const enterprisePerSeat = enterpriseBasePerSeat + (enterpriseTranslate ? enterpriseTranslatePerSeat : 0);
  const enterpriseSeatsClamped = Math.max(0, Math.min(seats || 0, 100));

  async function postCheckout(payload: CheckoutPayload) {
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      alert(await r.text().catch(() => "Checkout error"));
      return;
    }
    const { url } = await r.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <UtmCookieBoot />
      <h1 className="text-3xl font-bold mb-2">Simple, honest pricing</h1>
      <p className="text-zinc-600 mb-6">Start small, add seats or Translate when you need it.</p>

      <div className="flex items-center gap-3 mb-8">
        <button className={`px-3 py-1 rounded border ${cycle === "monthly" ? "bg-zinc-900 text-white" : ""}`} onClick={() => setCycle("monthly")}>
          Monthly
        </button>
        <button className={`px-3 py-1 rounded border ${cycle === "yearly" ? "bg-zinc-900 text-white" : ""}`} onClick={() => setCycle("yearly")}>
          Yearly (20% off)
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* SOLO */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Solo</h2>
          <p className="text-sm text-zinc-600 mb-4">1 seat</p>
          <div className="text-3xl font-bold mb-2">
            {formatAUD(PRICES.solo[cycle === "yearly" ? "yearly" : "monthly"])}
            <span className="text-base font-normal"> / {cycle === "yearly" ? "yr" : "mo"}</span>
          </div>
          <label className="flex items-center gap-2 my-4">
            <input type="checkbox" checked={soloTranslate} onChange={(e) => setSoloTranslate(e.target.checked)} />
            <span>Include Translate (+{formatAUD(PRICES.translateSolo[cycle === "yearly" ? "yearly" : "monthly"])})</span>
          </label>
          <div className="text-lg mb-4">
            Total: <strong>{formatAUD(soloTotal)}</strong> / {cycle === "yearly" ? "yr" : "mo"}
          </div>
          <button className="w-full rounded-xl bg-blue-600 text-white py-2" onClick={() => postCheckout({ plan: "solo", cycle, translate: soloTranslate })}>
            Start {cycle === "yearly" ? "Yearly" : "Monthly"}
          </button>
        </div>

        {/* TEAM (5 seats) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Team</h2>
          <p className="text-sm text-zinc-600 mb-1">5 seats bundle</p>
          <div className="text-3xl font-bold mb-2">
            {formatAUD(PRICES.team5[cycle === "yearly" ? "yearly" : "monthly"])}
            <span className="text-base font-normal"> / {cycle === "yearly" ? "yr" : "mo"}</span>
          </div>
          <label className="flex items-center gap-2 my-4">
            <input type="checkbox" checked={teamTranslate} onChange={(e) => setTeamTranslate(e.target.checked)} />
            <span>Include Translate (+{formatAUD(PRICES.team5Translate[cycle === "yearly" ? "yearly" : "monthly"])})</span>
          </label>
          <div className="text-lg mb-4">
            Total: <strong>{formatAUD(teamTotal)}</strong> / {cycle === "yearly" ? "yr" : "mo"}
          </div>
          <button className="w-full rounded-xl bg-blue-600 text-white py-2" onClick={() => postCheckout({ plan: "team5", cycle, translate: teamTranslate })}>
            Start {cycle === "yearly" ? "Yearly" : "Monthly"}
          </button>
        </div>

        {/* ENTERPRISE 6-100 (monthly only) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Enterprise</h2>
          <p className="text-xs text-zinc-500 -mt-1 mb-3">Enterprise is monthly only.</p>

          <div className="flex items-center gap-3 my-3">
            <label className="text-sm w-24">Seats</label>
            <input
              type="number"
              min={1}
              max={999}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value || "0", 10))}
              className="w-28 rounded border px-2 py-1"
            />
          </div>

          <label className="flex items-center gap-2 my-2">
            <input type="checkbox" checked={enterpriseTranslate} onChange={(e) => setEnterpriseTranslate(e.target.checked)} />
            <span>Include Translate (+{formatAUD(PRICES.translateEnterprise.monthly)} / seat)</span>
          </label>

          <p className="text-xs text-zinc-600">
            Per seat: ${enterpriseBasePerSeat.toFixed(2)}
            {enterpriseTranslate ? ` + $${enterpriseTranslatePerSeat.toFixed(2)}` : ""}
          </p>

          <div className="mt-1 font-medium">
            Total ({enterpriseSeatsClamped} {enterpriseSeatsClamped === 1 ? "seat" : "seats"}): {formatAUD(enterpriseTotal)} / mo
          </div>

          {over ? (
            <a href="/contact" className="block text-center w-full rounded-xl bg-zinc-900 text-white py-2">
              Contact sales for 100+ seats
            </a>
          ) : under ? (
            <button className="w-full rounded-xl bg-zinc-400 text-white py-2 cursor-not-allowed" disabled>
              Min 6 seats for Enterprise
            </button>
          ) : (
            <button
              className="w-full rounded-xl bg-blue-600 text-white py-2"
              onClick={() =>
                postCheckout({
                  plan: "enterprise",
                  cycle: "monthly",
                  translate: enterpriseTranslate,
                  seats: Math.min(Math.max(seats, 6), 100),
                })
              }
            >
              Start monthly
            </button>
          )}
        </div>
      </div>

      {/* One-Week Pass */}
      <div className="mt-10 grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">One-Week Pass</h2>
          <p className="text-sm text-zinc-600 mb-4">7-day access. No subscription.</p>
          <div className="text-3xl font-bold mb-4">{formatAUD(PRICES.weekpass)}</div>
          <button className="w-full rounded-xl bg-emerald-600 text-white py-2" onClick={() => postCheckout({ plan: "weekpass" })}>
            Buy 1-week pass
          </button>
        </div>
      </div>

      <TrialToggle defaultOn={trialDefault} />

      <PricingFAQ />
    </div>
  );
}



