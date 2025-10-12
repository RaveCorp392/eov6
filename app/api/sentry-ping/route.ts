import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Re-init is safe; keeps this self-contained even if instrumentation didn't run.
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });
    Sentry.captureMessage("SERVER_PING");
  }
  return NextResponse.json({ ok: true, sent: !!process.env.SENTRY_DSN });
}
