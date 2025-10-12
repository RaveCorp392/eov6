import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  // eslint-disable-next-line no-throw-literal
  throw { message: "SENTRY_TEST_SERVER_ERROR", hint: "server-smoke", path: "/api/boom" };
}
export async function HEAD() {
  return NextResponse.json({ ok: true, msg: "Use GET to trigger a test error." });
}
