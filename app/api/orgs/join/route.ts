import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "@/lib/firebaseAdmin";
import { normalizeSlug } from "@/lib/slugify";

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
    const rawOrgInput =
      (body && (body as Record<string, unknown>).org) ??
      (body && (body as Record<string, unknown>).orgId) ??
      url.searchParams.get("org") ??
      url.searchParams.get("orgId") ??
      "";
    const org = normalizeSlug(typeof rawOrgInput === "string" ? rawOrgInput : String(rawOrgInput ?? "")).trim();

    if (!org) {
      return NextResponse.json({ ok: false, code: "missing_org" }, { status: 400 });
    }

    const user = await getUserFromAuthHeader(req);
    if (!user?.uid) {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    const orgRef = adminDb.collection("orgs").doc(org);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return NextResponse.json({ ok: false, code: "org_not_found" }, { status: 404 });
    }

    const memberRef = orgRef.collection("members").doc(user.uid);
    let memberSnap = await memberRef.get();

    const normalizedEmail = user.email?.toLowerCase() ?? null;
    let entitlementData: Record<string, unknown> | null = null;
    if (normalizedEmail) {
      try {
        const entitlementSnap = await adminDb.collection("entitlements").doc(normalizedEmail).get();
        entitlementData = entitlementSnap.exists ? (entitlementSnap.data() as Record<string, unknown>) : null;
      } catch (entitlementError) {
        console.warn("[orgs/join] entitlement lookup failed", entitlementError);
      }
    }

    if (!memberSnap.exists) {
      const orgData = orgSnap.data() ?? {};
      const ownerEmail =
        typeof orgData.ownerEmail === "string" ? orgData.ownerEmail.toLowerCase() : null;
      const entOrgId =
        entitlementData && typeof (entitlementData as { orgId?: unknown }).orgId === "string"
          ? String((entitlementData as { orgId: string }).orgId)
          : null;
      const isOwner = Boolean(normalizedEmail && ownerEmail && normalizedEmail === ownerEmail);
      const isEntitled = Boolean(entOrgId && entOrgId === org);
      const orgDomains: string[] = Array.isArray(orgData?.domains)
        ? (orgData.domains as unknown[]).map((value) => String(value ?? "").toLowerCase()).filter(Boolean)
        : [];
      const emailDomain =
        normalizedEmail && normalizedEmail.includes("@")
          ? normalizedEmail.split("@").pop() ?? ""
          : "";
      const domainAllowed = Boolean(emailDomain && orgDomains.includes(emailDomain));

      if (isOwner || isEntitled || domainAllowed) {
        const now = Date.now();
        await memberRef.set(
          {
            uid: user.uid,
            email: user.email ?? null,
            role: isOwner ? "owner" : "member",
            joinedAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
        memberSnap = await memberRef.get();
      } else {
        return NextResponse.json({ ok: false, code: "not_a_member" }, { status: 403 });
      }
    }

    if (normalizedEmail) {
      const entitlementUpdatedAt = Date.now();
      await adminDb
        .collection("entitlements")
        .doc(normalizedEmail)
        .set({ ...(entitlementData ?? {}), orgId: org, updatedAt: entitlementUpdatedAt }, { merge: true });
      entitlementData = { ...(entitlementData ?? {}), orgId: org, updatedAt: entitlementUpdatedAt };
    }

    const res = NextResponse.json({
      ok: true,
      org: { id: org, ...(orgSnap.data() ?? {}) },
      entitlement: entitlementData,
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
