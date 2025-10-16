'use client';

import React from "react";
import { useSearchParams } from "next/navigation";

type Reason = "too_expensive" | "not_useful" | "chose_competitor" | "other";

export default function ClientFeedback() {
  const searchParams = useSearchParams();
  const [reason, setReason] = React.useState<Reason>("too_expensive");
  const [competitor, setCompetitor] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [offerUrl, setOfferUrl] = React.useState<string | undefined>(undefined);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const org = searchParams.get("org") || "";
  const email = searchParams.get("email") || "";
  const plan = searchParams.get("plan") || "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trial/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org,
          email,
          plan,
          reason,
          competitor: competitor || null,
          message: message || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.code || "feedback_error");
        return;
      }
      setOfferUrl(data.offerUrl as string | undefined);
      setDone(true);
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  const reasons: Array<[Reason, string]> = [
    ["too_expensive", "It's too expensive"],
    ["not_useful", "I didn't find it useful"],
    ["chose_competitor", "I chose a different product"],
    ["other", "Other"],
  ];

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Help us improve</h1>
      <p className="text-sm text-slate-600">
        If you decided not to continue with EOV6, a quick note helps us understand why.
      </p>
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Main reason</label>
          <div className="grid gap-2">
            {reasons.map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {reason === "chose_competitor" && (
          <div>
            <label className="block text-sm font-medium">Which product?</label>
            <input
              value={competitor}
              onChange={(event) => setCompetitor(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Vendor / tool"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Anything else?</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Optional notes..."
          />
        </div>

        <button
          disabled={busy}
          className="rounded bg-cyan-600 px-4 py-2 text-white transition disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send feedback"}
        </button>
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </form>

      {done && reason === "too_expensive" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Thanks - would a lower price help?
          {offerUrl ? (
            <a
              href={offerUrl}
              className="ml-1 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Click here to try our lower-price plan.
            </a>
          ) : (
            <> We can offer a lower-price plan; please try again in a few minutes.</>
          )}
        </div>
      )}
    </main>
  );
}
