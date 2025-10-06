export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
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

    const body = (await req.json().catch(() => null)) as { orgId?: string } | null;
    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    if (!orgId) return json({ error: "missing_orgId" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const memberRef = orgRef.collection("members").doc(uid);
    const entRef = db.collection("entitlements").doc(email);
    const targetNorm = normEmail(email);
    let logPayload: Record<string, any> | null = null;

    await db.runTransaction(async (tx) => {
      const orgSnap = await tx.get(orgRef);
      if (!orgSnap.exists) throw new Error("org_not_found");

      const orgData = orgSnap.data() as any;
      const ownerEmail = String(orgData?.ownerEmail || "").toLowerCase().trim();
      const pendingOwnerEmail = String(orgData?.pendingOwnerEmail || "").toLowerCase().trim();

      const memberSnap = await tx.get(memberRef);
      const now = Date.now();

      if (memberSnap.exists) {
        tx.set(memberRef, { email, updatedAt: now }, { merge: true });
        tx.set(entRef, { orgId, updatedAt: now }, { merge: true });
        logPayload = { orgId, email, path: "claim", status: "existing-member" };
        return;
      }

      if (!ownerEmail || (pendingOwnerEmail && pendingOwnerEmail === email)) {
        tx.set(orgRef, { ownerEmail: email, pendingOwnerEmail: null, updatedAt: now }, { merge: true });
        tx.set(memberRef, { role: "owner", email, createdAt: now, updatedAt: now }, { merge: true });
        tx.set(entRef, { orgId, claimedAt: now, updatedAt: now }, { merge: true });
        logPayload = { orgId, email, path: "claim", status: "owner" };
        return;
      }

      const invitesSnap = await tx.get(orgRef.collection("invites").where("status", "==", "pending"));
      const inviteDoc = invitesSnap.docs.find((docSnap) => {
        const data = docSnap.data() as any;
        const storedNorm = typeof data?.norm === "string" && data.norm ? data.norm : null;
        const candidate = storedNorm || normEmail(String(data?.email || ""));
        return candidate === targetNorm;
      });
      if (!inviteDoc) throw new Error("no_pending_invite");

      tx.set(inviteDoc.ref, { status: "accepted", acceptedAt: now, updatedAt: now }, { merge: true });
      tx.set(memberRef, { role: "viewer", email, createdAt: now, updatedAt: now }, { merge: true });
      tx.set(entRef, { orgId, claimedAt: now, updatedAt: now }, { merge: true });
      logPayload = { orgId, email, path: "claim", status: "viewer", inviteId: inviteDoc.id };
    });

    console.log("[api/orgs/claim]", logPayload ?? { orgId, email, path: "claim" });
    return json({ ok: true, orgId });
  } catch (err: any) {
    const message = String(err?.message || err);
    if (message === "org_not_found") return json({ error: "org_not_found" }, { status: 404 });
    if (message === "no_pending_invite") return json({ error: "no_pending_invite" }, { status: 403 });
    return json({ error: message }, { status: 400 });
  }
}
