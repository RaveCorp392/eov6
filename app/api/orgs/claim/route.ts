export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normEmail } from "@/lib/email-normalize";
import { getAuth } from "firebase-admin/auth";

function json(data: any, init?: { status?: number }) {
  return NextResponse.json(data, init);
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return json({ error: "no_token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid || "";
    const email = (decoded.email || "").toLowerCase().trim();
    if (!uid || !email) return json({ error: "no_email" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as { orgId?: string; token?: string } | null;
    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!orgId || !token) return json({ error: "missing_token_or_orgId" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const memberRef = orgRef.collection("members").doc(uid);
    const entRef = db.collection("entitlements").doc(email);
    const inviteRef = orgRef.collection("invites").doc(token);
    const targetNorm = normEmail(email);
    const emailDomain = (() => {
      const at = targetNorm.indexOf("@");
      if (at > 0) {
        const dom = targetNorm.slice(at + 1).toLowerCase().trim();
        return dom || null;
      }
      return null;
    })();
    let logPayload: Record<string, any> | null = null;

    await db.runTransaction(async (tx) => {
      const orgSnap = await tx.get(orgRef);
      if (!orgSnap.exists) throw new Error("org_not_found");

      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) throw new Error("invalid_invite");

      const inviteData = inviteSnap.data() as any;
      const inviteOrgId = typeof inviteData?.orgId === "string" && inviteData.orgId ? inviteData.orgId : orgId;
      if (inviteOrgId !== orgId) throw new Error("invite_org_mismatch");

      const inviteStatus = typeof inviteData?.status === "string" ? inviteData.status : "pending";
      if (inviteStatus !== "pending") throw new Error("invite_not_pending");

      const storedNorm = typeof inviteData?.norm === "string" && inviteData.norm
        ? inviteData.norm
        : normEmail(String(inviteData?.email || ""));
      if (storedNorm !== targetNorm) throw new Error("invite_email_mismatch");

      const memberSnap = await tx.get(memberRef);
      const now = Date.now();
      const existingCreated = memberSnap.exists ? (memberSnap.data() as any)?.createdAt : undefined;
      const createdAt = typeof existingCreated === "number" ? existingCreated : now;

      tx.set(memberRef, { role: "viewer", email, createdAt, updatedAt: now }, { merge: true });
      tx.set(inviteRef, { status: "accepted", acceptedAt: now, updatedAt: now }, { merge: true });
      tx.set(entRef, { orgId, claimedAt: now, updatedAt: now }, { merge: true });

      logPayload = { orgId, email, path: "claim", status: "viewer", inviteId: token };
    });

    if (emailDomain) {
      try {
        await orgRef.update({ domains: FieldValue.arrayUnion(emailDomain) });
      } catch {
        await orgRef.set({ domains: [emailDomain] }, { merge: true });
      }
    }

    console.log("[api/orgs/claim]", logPayload ?? { orgId, email, path: "claim" });
    return json({ ok: true, orgId });
  } catch (err: any) {
    const message = String(err?.message || err);
    if (message === "org_not_found") return json({ error: "org_not_found" }, { status: 404 });
    if (message === "invalid_invite") return json({ error: "invalid_invite" }, { status: 404 });
    if (message === "invite_not_pending") return json({ error: "invite_not_pending" }, { status: 403 });
    if (message === "invite_email_mismatch") return json({ error: "invite_email_mismatch" }, { status: 403 });
    if (message === "invite_org_mismatch") return json({ error: "invite_org_mismatch" }, { status: 400 });
    return json({ error: message }, { status: 400 });
  }
}
