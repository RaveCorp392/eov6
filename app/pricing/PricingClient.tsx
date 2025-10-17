'use client';

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useMemo, useState } from "react";
import PricingFAQ from "@/components/pricing/FAQ";
import { auth, googleProvider, signInWithPopup } from "@/lib/firebase";
import { getUtmCookie } from "@/lib/utm";
import UtmCookieBoot from "@/app/_client/UtmCookieBoot";
import { maybeSetTrialCookieFromUTM } from "@/lib/trialClient";

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
  solo: { monthly: 500, yearly: Math.round(500 * 12 * 0.8) }, // $5 -> ~$48
  translateSolo: { monthly: 100, yearly: Math.round(100 * 12 * 0.8) }, // $1 -> ~$9.6
  team5: { monthly: 2500, yearly: Math.round(2500 * 12 * 0.8) }, // $25 -> ~$240
  team5Translate: { monthly: 500, yearly: Math.round(500 * 12 * 0.8) }, // $5 -> ~$48
  translateEnterprise: { monthly: 50 }, // $0.50 (monthly only)
  weekpass: 500, // $5 one-time
};

function getClientCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  const matcher = `${name}=`;
  const found = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(matcher));
  if (!found) return undefined;
  return decodeURIComponent(found.substring(matcher.length));
}

function hasTrialCookie() {
  const value = getClientCookie("trial_eligible");
  return value === "1" || value === "true";
}

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
          {busy ? "Redirecting..." : trial ? "Start Trial" : "Subscribe"}
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
          We&apos;ll guide you through creating your org before billing.
        </div>
      )}
    </div>
  );
}

export default function PricingClient() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [trialDefault, setTrialDefault] = useState(false);
  const [trialEligible, setTrialEligible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    maybeSetTrialCookieFromUTM();
    const cookieEligible = hasTrialCookie();

    try {
      const url = new URL(window.location.href);
      const trialQuery = url.searchParams.get("trial") === "1";
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      const hasUtmQuery = utmKeys.some((key) => !!url.searchParams.get(key));
      const cookie = getUtmCookie();
      setTrialDefault(trialQuery || hasUtmQuery || Boolean(cookie) || cookieEligible);
    } catch {
      setTrialDefault(cookieEligible);
    }

    setTrialEligible(cookieEligible);
  }, []);

  const [soloTranslate, setSoloTranslate] = useState(false);
  const soloTotal = useMemo(() => {
    const base = PRICES.solo[cycle === "yearly" ? "yearly" : "monthly"];
    const add = soloTranslate ? PRICES.translateSolo[cycle === "yearly" ? "yearly" : "monthly"] : 0;
    return base + add;
  }, [cycle, soloTranslate]);

  const [teamTranslate, setTeamTranslate] = useState(false);
  const teamTotal = useMemo(() => {
    const base = PRICES.team5[cycle === "yearly" ? "yearly" : "monthly"];
    const add = teamTranslate
      ? PRICES.team5Translate[cycle === "yearly" ? "yearly" : "monthly"]
      : 0;
    return base + add;
  }, [cycle, teamTranslate]);

  const [enterpriseTranslate, setEnterpriseTranslate] = useState(true);
  const [seats, setSeats] = useState(30);
  const over = seats > 100;
  const under = seats < 6;

  const enterpriseTotal = useMemo(() => {
    const s = Math.max(0, Math.min(seats || 0, 100));
    const basePerSeat = 300;
    const translatePerSeat = enterpriseTranslate ? PRICES.translateEnterprise.monthly : 0;
    return s * (basePerSeat + translatePerSeat);
  }, [seats, enterpriseTranslate]);

  const enterpriseBasePerSeat = 3.0;
  const enterpriseTranslatePerSeat = 0.5;
  const enterprisePerSeat =
    enterpriseBasePerSeat + (enterpriseTranslate ? enterpriseTranslatePerSeat : 0);
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
      <h1 className="mb-2 text-3xl font-bold">Simple, honest pricing</h1>
      <p className="mb-6 text-zinc-600">Start small, add seats or Translate when you need it.</p>

      <div className="mb-8 flex items-center gap-3">
        <button
          className={`rounded border px-3 py-1 ${cycle === "monthly" ? "bg-zinc-900 text-white" : ""}`}
          onClick={() => setCycle("monthly")}
        >
          Monthly
        </button>
        <button
          className={`rounded border px-3 py-1 ${cycle === "yearly" ? "bg-zinc-900 text-white" : ""}`}
          onClick={() => setCycle("yearly")}
        >
          Yearly (20% off)
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {/* SOLO */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Solo</h2>
          <p className="mb-4 text-sm text-zinc-600">1 seat</p>
          <div className="mb-2 text-3xl font-bold">
            {formatAUD(PRICES.solo[cycle === "yearly" ? "yearly" : "monthly"])}
            <span className="text-base font-normal"> / {cycle === "yearly" ? "yr" : "mo"}</span>
          </div>
          <label className="my-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={soloTranslate}
              onChange={(event) => setSoloTranslate(event.target.checked)}
            />
            <span>
              Include Translate (+{formatAUD(PRICES.translateSolo[cycle === "yearly" ? "yearly" : "monthly"])})
            </span>
          </label>
          <div className={`${trialEligible ? "mb-2" : "mb-4"} text-lg`}>
            Total: <strong>{formatAUD(soloTotal)}</strong> / {cycle === "yearly" ? "yr" : "mo"}
          </div>
          {trialEligible && (
            <p className="mb-4 text-xs text-zinc-500">No charge today. Cancel anytime.</p>
          )}
          <button
            className="w-full rounded-xl bg-blue-600 py-2 text-white"
            onClick={() => postCheckout({ plan: "solo", cycle, translate: soloTranslate })}
          >
            {trialEligible ? "Start 30-day free trial" : `Start ${cycle === "yearly" ? "Yearly" : "Monthly"}`}
          </button>
        </div>

        {/* TEAM (5 seats) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Team</h2>
          <p className="mb-1 text-sm text-zinc-600">5 seats bundle</p>
          <div className="mb-2 text-3xl font-bold">
            {formatAUD(PRICES.team5[cycle === "yearly" ? "yearly" : "monthly"])}
            <span className="text-base font-normal"> / {cycle === "yearly" ? "yr" : "mo"}</span>
          </div>
          <label className="my-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={teamTranslate}
              onChange={(event) => setTeamTranslate(event.target.checked)}
            />
            <span>
              Include Translate (+{formatAUD(PRICES.team5Translate[cycle === "yearly" ? "yearly" : "monthly"])})
            </span>
          </label>
          <div className={`${trialEligible ? "mb-2" : "mb-4"} text-lg`}>
            Total: <strong>{formatAUD(teamTotal)}</strong> / {cycle === "yearly" ? "yr" : "mo"}
          </div>
          {trialEligible && (
            <p className="mb-4 text-xs text-zinc-500">No charge today. Cancel anytime.</p>
          )}
          <button
            className="w-full rounded-xl bg-blue-600 py-2 text-white"
            onClick={() => postCheckout({ plan: "team5", cycle, translate: teamTranslate })}
          >
            {trialEligible ? "Start 30-day free trial" : `Start ${cycle === "yearly" ? "Yearly" : "Monthly"}`}
          </button>
        </div>

        {/* ENTERPRISE 6-100 (monthly only) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-semibold">Enterprise</h2>
          <p className="-mt-1 mb-3 text-xs text-zinc-500">Enterprise is monthly only.</p>

          <div className="my-3 flex items-center gap-3">
            <label className="w-24 text-sm">Seats</label>
            <input
              type="number"
              min={1}
              max={999}
              value={seats}
              onChange={(event) => setSeats(parseInt(event.target.value || "0", 10))}
              className="w-28 rounded border px-2 py-1"
            />
          </div>

          <label className="my-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={enterpriseTranslate}
              onChange={(event) => setEnterpriseTranslate(event.target.checked)}
            />
            <span>Include Translate (+{formatAUD(PRICES.translateEnterprise.monthly)} / seat)</span>
          </label>

          <p className="text-xs text-zinc-600">
            Per seat: ${enterpriseBasePerSeat.toFixed(2)}
            {enterpriseTranslate ? ` + $${enterpriseTranslatePerSeat.toFixed(2)}` : ""}
          </p>

          <div className={`mt-1 font-medium ${trialEligible ? "mb-2" : "mb-4"}`}>
            Total ({enterpriseSeatsClamped} {enterpriseSeatsClamped === 1 ? "seat" : "seats"}): {formatAUD(enterpriseTotal)} / mo
          </div>
          {trialEligible && (
            <p className="mb-4 text-xs text-zinc-500">No charge today. Cancel anytime.</p>
          )}

          {over ? (
            <a href="/contact" className="block w-full rounded-xl bg-zinc-900 py-2 text-center text-white">
              Contact sales for 100+ seats
            </a>
          ) : under ? (
            <button className="w-full cursor-not-allowed rounded-xl bg-zinc-400 py-2 text-white" disabled>
              Min 6 seats for Enterprise
            </button>
          ) : (
            <button
              className="w-full rounded-xl bg-blue-600 py-2 text-white"
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
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">One-Week Pass</h2>
          <p className="mb-4 text-sm text-zinc-600">7-day access. No subscription.</p>
          <div className="mb-4 text-3xl font-bold">{formatAUD(PRICES.weekpass)}</div>
          <button className="w-full rounded-xl bg-emerald-600 py-2 text-white" onClick={() => postCheckout({ plan: "weekpass" })}>
            Buy 1-week pass
          </button>
        </div>
      </div>

      <TrialToggle defaultOn={trialDefault} />

      <PricingFAQ />
    </div>
  );
}
