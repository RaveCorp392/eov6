import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hub = Sentry.getCurrentHub();
  if (!hub.getClient()) {
    // Fallback init in case instrumentation didn’t run in prod
    Sentry.init({
      dsn: process.env.SENTRY_DSN || "",
      tracesSampleRate: 0.0,
    });
  }
  Sentry.captureMessage("SERVER_PING");
  return NextResponse.json({ ok: true, sent: "SERVER_PING" });
}
