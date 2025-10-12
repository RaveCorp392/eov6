import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const ctx = {
    hint: "server-smoke",
    path: "/api/_sentry-test",
    note: "intentional test error — safe to remove after verification",
  };
  // eslint-disable-next-line no-throw-literal
  throw { message: "SENTRY_TEST_SERVER_ERROR", ...ctx };
}

export async function HEAD() {
  return NextResponse.json({ ok: true, msg: "Use GET to trigger a test error." });
}
