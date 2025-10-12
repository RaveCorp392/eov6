import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function isBuildPhase() {
  // Next sets NEXT_PHASE during build ("phase-production-build").
  return process.env.NEXT_PHASE?.includes("build");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const go = searchParams.get("go");

  // Never throw during **build** so export/prerender stays green
  if (isBuildPhase() || !go) {
    return NextResponse.json({
      ok: true,
      note: "server smoke is idle (append ?go=1 to trigger at runtime)",
    });
  }

  // Runtime smoke: trigger an unhandled error for Sentry
  // eslint-disable-next-line no-throw-literal
  throw { message: "SENTRY_TEST_SERVER_ERROR", hint: "server-smoke", path: "/api/boom?go=1" };
}

export async function HEAD() {
  return NextResponse.json({ ok: true, msg: "Use GET with ?go=1 to trigger a test error." });
}
