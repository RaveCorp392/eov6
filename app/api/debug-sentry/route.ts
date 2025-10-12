import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function head(v?: string | null) {
  if (!v) return null;
  const m = v.match(/^https?:\/\/([^@]+)@/);
  return (m ? m[1] : v).slice(0, 16) + "…";
}

export async function GET() {
  const server = process.env.SENTRY_DSN ?? null;
  const client = process.env.NEXT_PUBLIC_SENTRY_DSN ?? null;
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    server_dsn_present: !!server,
    server_dsn_head: head(server),
    client_dsn_present: !!client,
    client_dsn_head: head(client),
  });
}
