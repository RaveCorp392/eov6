export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { bucket } from "@/lib/firebase-admin";

const diagEnabled = process.env.DIAG_ENABLE === "1";

function regexFor(root: string) {
  const clean = root.replace(/\/+$/, "");
  return new RegExp(`^${clean}/(\d{6})/`);
}

export async function GET() {
  if (!diagEnabled) return new Response(null, { status: 404 });

  const roots = ["uploads", "sessions"];
  const out: Record<string, string[]> = {};
  try {
    for (const root of roots) {
      const rx = regexFor(root);
      let pageToken: string | undefined;
      const picked = new Set<string>();
      while (picked.size < 50) {
        const opts: any = { prefix: `${root}/`, autoPaginate: false, maxResults: 1000 };
        if (pageToken) opts.pageToken = pageToken;
        const res: any[] = await (bucket as any).getFiles(opts);
        const files: Array<{ name: string }> = res[0] ?? [];
        const nextQuery: any = res[1];
        const apiResp: any = res[2];

        for (const f of files) {
          const m = rx.exec(f.name);
          if (m) picked.add(m[1]);
          if (picked.size >= 50) break;
        }

        pageToken = (nextQuery && nextQuery.pageToken) || (apiResp && apiResp.nextPageToken);
        if (!pageToken) break;
      }
      out[root] = Array.from(picked);
    }
    return NextResponse.json({ ok: true, roots, codes: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}