import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(v?: string) {
  if (!v) return null;
  // show scheme + first 12 chars only
  const m = v.match(/^https?:\/\/([^@]+)@/);
  const head = m ? m[1].slice(0, 12) : v.slice(0, 12);
  return `${head}…`;
}

export async function GET() {
  const server = process.env.SENTRY_DSN || null;
  const client = process.env.NEXT_PUBLIC_SENTRY_DSN || null;
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    server_dsn_present: !!server,
    server_dsn_head: mask(server),
    client_dsn_present: !!client,
    client_dsn_head: mask(client),
  });
}
