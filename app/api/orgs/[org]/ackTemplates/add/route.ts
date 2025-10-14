import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { org: string } }) {
  try {
    const org = params.org?.trim();
    if (!org) {
      return NextResponse.json({ ok: false, code: "missing_org" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ ok: false, code: "no_token" }, { status: 401 });
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);

    const payload = await req.json().catch(() => null);
    const title = String(payload?.title ?? "").trim();
    const text = String(payload?.text ?? "");
    const required = Boolean(payload?.required ?? false);
    if (!title) {
      return NextResponse.json({ ok: false, code: "missing_title" }, { status: 400 });
    }

    const orgRef = adminDb.collection("orgs").doc(org);
    const membership = await orgRef.collection("members").doc(decoded.uid).get();
    const isInternal = (decoded.email || "").toLowerCase().endsWith("@eov6.com");
    if (!membership.exists && !isInternal) {
      return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const docRef = await orgRef.collection("ackTemplates").add({
      title,
      body: text,
      text,
      required,
      order: typeof payload?.order === "number" ? payload.order : now,
      createdAt: now,
      createdBy: decoded.uid,
      createdByEmail: decoded.email || null
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("[orgs/ackTemplates/add] error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
