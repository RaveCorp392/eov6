export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { sendWithZohoFallback } from "@/lib/mail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.eov6.com";

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "no_token" }, { status: 401 });
    const decoded = await getAuth().verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();

    const { orgId, emails } = (await req.json()) as { orgId: string; emails: string[] };
    if (!orgId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return NextResponse.json({ error: "org_not_found" }, { status: 404 });
    const orgData = orgSnap.data() || {};

    const me = await orgRef.collection("members").doc(decoded.uid).get();
    const isInternal = email.endsWith("@eov6.com");
    if (!me.exists && !isInternal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const cleanEmails = Array.from(
      new Set(
        (emails || [])
          .map((e) => (e || "").toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const batch = db.batch();
    for (const le of cleanEmails) {
      const inviteRef = orgRef.collection("invites").doc();
      batch.set(inviteRef, {
        email: le,
        status: "pending",
        invitedAt: Date.now(),
        invitedBy: email,
      });
    }
    await batch.commit();

    const invitedDomains = new Set<string>();
    for (const le of cleanEmails) {
      const at = le.indexOf("@");
      if (at > -1 && at < le.length - 1) invitedDomains.add(le.slice(at + 1));
    }

    if (invitedDomains.size) {
      const existing: string[] = Array.isArray(orgData?.domains) ? orgData.domains : [];
      const merged = new Set<string>(existing.map((d) => String(d).toLowerCase()));
      for (const d of invitedDomains) merged.add(d);
      await orgRef.set({ domains: Array.from(merged) }, { merge: true });
    }

    const orgName = orgData?.name || orgId;
    for (const le of cleanEmails) {
      const link = `${SITE_URL}/onboard/claim?org=${encodeURIComponent(orgId)}&email=${encodeURIComponent(le)}`;
      await sendWithZohoFallback({
        to: le,
        subject: `You're invited to join ${orgName} on EOV6`,
        text: `You've been invited to join ${orgName} on EOV6. Accept the invite: ${link}`,
        html: `<!doctype html><p>You've been invited to join <strong>${orgName}</strong> on EOV6.</p><p><a href="${link}">Accept invitation</a></p><p>If the button doesn't work, copy and paste this URL:<br/>${link}</p>`,
      });
    }

    return NextResponse.json({ ok: true, count: cleanEmails.length });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
