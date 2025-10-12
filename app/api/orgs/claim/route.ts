import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

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
      return NextResponse.json(
        { ok: false, code: "missing_params" },
        { status: 400 }
      );
    }

    const { uid, email } = await requireUser();
    if (!uid || !email) {
      return NextResponse.json(
        { ok: false, code: "no_user" },
        { status: 401 }
      );
    }

    const db = adminDb;
    const orgRef = db.collection("orgs").doc(org);
    const inviteRef = orgRef.collection("invites").doc(token);
    const memberRef = orgRef.collection("members").doc(uid);

    const [orgSnap, inviteSnap] = await Promise.all([
      orgRef.get(),
      inviteRef.get(),
    ]);

    if (!orgSnap.exists) {
      return NextResponse.json(
        { ok: false, code: "org_not_found" },
        { status: 404 }
      );
    }

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { ok: false, code: "invalid_invite" },
        { status: 400 }
      );
    }

    const inv = inviteSnap.data() as any;

    if (Array.isArray(inv?.domains) && inv.domains.length > 0) {
      const domain = String(email).split("@").pop()?.toLowerCase() ?? "";
      if (!domain || !inv.domains.includes(domain)) {
        return NextResponse.json(
          { ok: false, code: "domain_mismatch" },
          { status: 400 }
        );
      }
    }

    await db.runTransaction(async (tx) => {
      tx.set(
        memberRef,
        {
          uid,
          email: email ?? null,
          role: inv?.role ?? "member",
          joinedAt: new Date(),
        },
        { merge: true }
      );

      tx.delete(inviteRef);
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("claim error", e);
    return NextResponse.json(
      { ok: false, code: "server_error" },
      { status: 500 }
    );
  }
}
