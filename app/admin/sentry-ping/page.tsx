"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryPing() {
  const [status, setStatus] = useState<string>("idle");

  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Sentry Client Ping</h1>
      <button
        className="rounded px-4 py-2 bg-cyan-600 text-white"
        onClick={() => {
          try {
            Sentry.captureMessage("CLIENT_PING");
            setStatus("sent");
          } catch (e) {
            setStatus("failed");
            console.error(e);
          }
        }}
      >
        Send CLIENT_PING
      </button>
      <p className="text-sm text-slate-600">Status: {status}</p>
    </main>
  );
}
