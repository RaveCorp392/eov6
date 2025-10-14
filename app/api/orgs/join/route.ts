import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const adminAuth = getAuth(getAdminApp());

async function getUserFromAuthHeader(req: Request) {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch (error) {
    console.warn("[orgs/join] invalid bearer token", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const org = String(body.org ?? url.searchParams.get("org") ?? "").trim();

    if (!org) {
      return NextResponse.json({ ok: false, code: "missing_org" }, { status: 400 });
    }

    const user = await getUserFromAuthHeader(req);
    if (!user?.uid) {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    const memberRef = adminDb.collection("orgs").doc(org).collection("members").doc(user.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ ok: false, code: "not_a_member" }, { status: 403 });
    }

    const orgRef = adminDb.collection("orgs").doc(org);
    const [orgSnap, entitlementSnap] = await Promise.all([
      orgRef.get(),
      user.email ? adminDb.collection("entitlements").doc(user.email.toLowerCase()).get() : null,
    ]);

    const res = NextResponse.json({
      ok: true,
      org: { id: org, ...(orgSnap.data() ?? {}) },
      entitlement: entitlementSnap && entitlementSnap.exists ? entitlementSnap.data() : null,
    });

    const secureCookie = process.env.NODE_ENV === "production";
    const cookieDomain = process.env.ACTIVE_ORG_COOKIE_DOMAIN;
    res.cookies.set({
      name: "active_org",
      value: org,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return res;
  } catch (error) {
    console.error("[orgs/join] error", error);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
