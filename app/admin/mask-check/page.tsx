"use client";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function MaskCheck() {
  const [done, setDone] = useState(false);

  const run = () => {
    // move URL to a “session-like” path
    const original = window.location.pathname + window.location.search;
    const fake = "/s/123456";
    history.pushState({}, "", fake);

    // init (safe even if instrumentation already did)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 });
      Sentry.captureMessage("MASK_PROOF");
    }

    // restore URL so the user isn’t stranded
    history.replaceState({}, "", original);
    setDone(true);
  };

  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Masking Proof</h1>
      <button className="rounded px-4 py-2 bg-cyan-600 text-white" onClick={run}>
        Send MASK_PROOF (pretend /s/123456)
      </button>
      <p className="text-sm text-slate-600">Status: {done ? "sent" : "idle"}</p>
    </main>
  );
}
