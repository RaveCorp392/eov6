import { NextResponse } from "next/server";
import { adminDb, getAdminApp } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth";
import { getAuth } from "firebase-admin/auth";

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
    console.warn("[orgs/claim] invalid bearer token", error);
    return null;
  }
}

/**
 * POST /api/orgs/claim
 * Body: { token: string; org: string }  // token = invite doc id, org = slug
 * Behavior:
 *  - Read the invite (Admin SDK)
 *  - (Optional) validate email domain vs invite.domains
 *  - Create org member (Admin SDK)
 *  - Delete invite (consume)
 *  - Return ok:true
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const url = new URL(req.url);
    const token = String(body["token"] ?? url.searchParams.get("token") ?? "");
    const org = String(body["org"] ?? url.searchParams.get("org") ?? "");

    if (!token || !org) {
      return NextResponse.json({ ok: false, code: "missing_params" }, { status: 400 });
    }

    let user: { uid: string; email: string | null } | null = null;
    try {
      const required = await requireUser();
      if (required?.uid) {
        user = { uid: required.uid, email: required.email ?? null };
      }
    } catch {
      user = null;
    }

    if (!user) {
      user = await getUserFromAuthHeader(req);
    }

    if (!user?.uid || !user.email) {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    const { uid, email } = user;

    const orgRef = adminDb.collection("orgs").doc(org);
    const inviteRef = orgRef.collection("invites").doc(token);
    const memberRef = orgRef.collection("members").doc(uid);

    const [orgSnap, inviteSnap] = await Promise.all([
      orgRef.get(),
      inviteRef.get(),
    ]);

    if (!orgSnap.exists) {
      return NextResponse.json({ ok: false, code: "org_not_found" }, { status: 404 });
    }

    if (!inviteSnap.exists) {
      return NextResponse.json({ ok: false, code: "invalid_invite" }, { status: 400 });
    }

    const inv = inviteSnap.data() as any;

    if (Array.isArray(inv?.domains) && inv.domains.length > 0) {
      const domain = String(email).split("@").pop()?.toLowerCase() ?? "";
      if (!domain || !inv.domains.includes(domain)) {
        return NextResponse.json({ ok: false, code: "domain_mismatch" }, { status: 400 });
      }
    }

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        memberRef,
        {
          uid,
          email: email ?? null,
          role: inv?.role ?? "member",
          joinedAt: new Date(),
        },
        { merge: true },
      );

      tx.delete(inviteRef);
    });

    return NextResponse.json({ ok: true, orgId: org });
  } catch (e) {
    console.error("claim error", e);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
