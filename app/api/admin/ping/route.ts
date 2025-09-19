import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { email } = await requireAdmin(req);
    return NextResponse.json({ ok: true, email, allowlist: process.env.ADMIN_ALLOWLIST || "" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "auth-error", allowlist: process.env.ADMIN_ALLOWLIST || "" },
      { status: 401 }
    );
  }
}

