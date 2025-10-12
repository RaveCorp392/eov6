"use client";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function MaskCheck() {
  const [status, setStatus] = useState("idle");
  const run = () => {
    const original = window.location.pathname + window.location.search;
    history.pushState({}, "", "/s/123456");
    Sentry.captureMessage("MASK_PROOF");
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
