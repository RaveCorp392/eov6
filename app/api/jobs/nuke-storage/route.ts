export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { bucket } from "@/lib/firebase-admin";

function nukesAllowed() {
  return process.env.NUKE_ENABLE === "1";
}

export async function GET(req: Request) {
  if (!nukesAllowed()) {
    return NextResponse.json({ ok: false, error: "disabled", note: "Set NUKE_ENABLE=1 to allow nuke-storage." }, { status: 403 });
  }

  const url = new URL(req.url);
  const key = (url.searchParams.get("key") || "").trim();
  const envKey = (process.env.CRON_SECRET || "").trim();
  const dryRun = url.searchParams.get("dryRun") === "1";
  const prefixesParam = (url.searchParams.get("prefix") || "uploads,sessions").trim();
  const roots = prefixesParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (!envKey) return NextResponse.json({ ok: false, error: "unauthorized", reason: "missing-env" }, { status: 401 });
  if (!key || key !== envKey) return NextResponse.json({ ok: false, error: "unauthorized", reason: "bad-key" }, { status: 401 });

  try {
    const report: Array<{ prefix: string; found: number; deleted?: number; error?: string }> = [];

    for (const root of roots) {
      const clean = root.replace(/\/+$/, "");
      const prefix = `${clean}/`;

      let found = 0;
      let pageToken: string | undefined;
      while (true) {
        const opts: any = { prefix, autoPaginate: false, maxResults: 1000 };
        if (pageToken) opts.pageToken = pageToken;
        const res: any[] = await (bucket as any).getFiles(opts);
        const files: any[] = res[0] ?? [];
        const nextQuery: any = res[1];
        const apiResp: any = res[2];
        found += files.length;
        pageToken = (nextQuery && nextQuery.pageToken) || (apiResp && apiResp.nextPageToken);
        if (!pageToken) break;
      }

      const row: any = { prefix, found };
      if (!dryRun && found > 0) {
        try {
          await bucket.deleteFiles({ prefix, force: true });
          row.deleted = found;
        } catch (e: any) {
          row.error = String(e?.message || e);
        }
      }
      report.push(row);
    }

    return NextResponse.json({ ok: true, dryRun, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "internal", reason: String(e?.message || e) }, { status: 500 });
  }
}