import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hub = Sentry.getCurrentHub();
  const client = hub.getClient();
  const opts = (client as any)?.getOptions?.() ?? {};
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    client_present: !!client,
    client_dsn_head:
      typeof opts.dsn === "string" ? String(opts.dsn).slice(0, 16) + "…" : null,
    env_server_dsn_head: (process.env.SENTRY_DSN || "").slice(0, 16) + "…",
  });
}
