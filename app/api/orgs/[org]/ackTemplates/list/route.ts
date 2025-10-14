import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "@/lib/firebaseAdmin";
import { normalizeSlug } from "@/lib/slugify";

export const runtime = "nodejs";

const adminAuth = getAuth(getAdminApp());

function toSortableNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

export async function GET(req: NextRequest, { params }: { params: { org: string } }) {
  try {
    const org = normalizeSlug(params.org);
    if (!org) {
      return NextResponse.json({ ok: false, code: "missing_org" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ ok: false, code: "no_token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const isInternal = (decoded.email || "").toLowerCase().endsWith("@eov6.com");

    const orgRef = adminDb.collection("orgs").doc(org);
    const membership = await orgRef.collection("members").doc(decoded.uid).get();
    if (!membership.exists && !isInternal) {
      return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
    }

    const snap = await orgRef.collection("ackTemplates").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
    items.sort((a, b) => {
      const orderDiff = toSortableNumber((a as { order?: unknown }).order) - toSortableNumber((b as { order?: unknown }).order);
      if (orderDiff !== 0) return orderDiff;
      return toSortableNumber((a as { createdAt?: unknown }).createdAt) - toSortableNumber((b as { createdAt?: unknown }).createdAt);
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[orgs/ackTemplates/list] error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
