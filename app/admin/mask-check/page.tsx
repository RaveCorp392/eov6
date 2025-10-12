"use client";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

function withMaskingInit() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    beforeSend(event) {
      try {
        const mask = (url?: string) =>
          url ? url.replace(/(\/s\/)(\d{6})(\b|\/)/g, "$1[code]$3") : url;
        if (event.request?.url) event.request.url = mask(event.request.url);
        const h = event.request?.headers as any;
        if (h?.Referer) h.Referer = mask(String(h.Referer));
        if (h?.referer) h.referer = mask(String(h.referer));
      } catch {}
      return event;
    },
  });
}

export default function MaskCheck() {
  const [status, setStatus] = useState("idle");

  const run = () => {
    const original = window.location.pathname + window.location.search;
    const fake = "/s/123456";
    history.pushState({}, "", fake);

    // init WITH MASKING (so this event is filtered)
    withMaskingInit();
    Sentry.captureMessage("MASK_PROOF");

    // restore URL
    history.replaceState({}, "", original);
    setStatus("sent");
  };

  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Masking Proof</h1>
      <button className="rounded px-4 py-2 bg-cyan-600 text-white" onClick={run}>
        Send MASK_PROOF (pretend /s/123456)
      </button>
      <p className="text-sm text-slate-600">Status: {status}</p>
    </main>
  );
}
