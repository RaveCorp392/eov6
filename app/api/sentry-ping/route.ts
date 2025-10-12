import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  Sentry.captureMessage("SERVER_PING");
  return NextResponse.json({ ok: true, sent: "SERVER_PING" });
}
