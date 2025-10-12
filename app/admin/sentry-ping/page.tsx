"use client";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryPing() {
  const [status, setStatus] = useState("idle");

  const send = () => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 });
      Sentry.captureMessage("CLIENT_PING");
      setStatus("sent");
    } else {
      setStatus("no-dsn");
    }
  };

  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Sentry Client Ping</h1>
      <button className="rounded px-4 py-2 bg-cyan-600 text-white" onClick={send}>
        Send CLIENT_PING
      </button>
      <p className="text-sm text-slate-600">Status: {status}</p>
    </main>
  );
}
