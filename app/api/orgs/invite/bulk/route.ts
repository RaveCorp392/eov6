export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";
import { normEmail } from "@/lib/email-normalize";

type InviteStatus = "pending" | "accepted" | "revoked";
type InviteDoc = {
  email: string;
  norm: string;
  status: InviteStatus;
  invitedAt: number;
  invitedBy: string;
};

function mailer() {
  return nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST!,
    port: Number(process.env.ZOHO_SMTP_PORT || 587),
    secure: Number(process.env.ZOHO_SMTP_PORT || 0) === 465,
    auth: {
      user: process.env.ZOHO_SMTP_USER!,
      pass: process.env.ZOHO_SMTP_PASS!,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "no_token" }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const invitedBy = (decoded.email || "").toLowerCase();

    const body = (await req.json().catch(() => null)) as { orgId?: string; emails?: unknown[] } | null;
    const orgId = typeof body?.orgId === "string" ? body.orgId.trim() : "";
    const emails = Array.isArray(body?.emails) ? body.emails : [];

    if (!orgId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const rawList = emails
      .map((value) => String(value ?? "").trim())
      .filter((value) => value.length > 0);

    if (rawList.length === 0) {
      return NextResponse.json({ error: "no_recipients" }, { status: 400 });
    }

    const db = getFirestore();
    const orgRef = db.collection("orgs").doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return NextResponse.json({ error: "org_not_found" }, { status: 404 });
    }

    const memberSnap = await orgRef.collection("members").doc(decoded.uid || "").get();
    const isInternal = invitedBy.endsWith("@eov6.com");
    if (!memberSnap.exists && !isInternal) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const seen = new Set<string>();
    const clean: string[] = [];
    for (const raw of rawList) {
      const normalized = normEmail(raw);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      clean.push(raw);
    }

    if (clean.length === 0) {
      return NextResponse.json({ error: "no_recipients" }, { status: 400 });
    }

    const batch = db.batch();
    const created: Array<InviteDoc & { id: string }> = [];
    const now = Date.now();

    for (const raw of clean) {
      const ref = orgRef.collection("invites").doc();
      const data: InviteDoc = {
        email: raw,
        norm: normEmail(raw),
        status: "pending",
        invitedAt: now,
        invitedBy,
      };
      batch.set(ref, data, { merge: true });
      created.push({ id: ref.id, ...data });
    }

    await batch.commit();

    const transporter = mailer();
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.eov6.com";
    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
    const orgName = ((orgSnap.data() as any)?.name || orgId) as string;

    for (const invite of created) {
      const link = `${base}/onboard/claim?org=${encodeURIComponent(orgId)}&email=${encodeURIComponent(invite.email)}`;
      await transporter.sendMail({
        from,
        to: invite.email,
        subject: `Invitation to ${orgName} on EOV6`,
        text: `You've been invited to join ${orgName} on EOV6.\n\nClaim: ${link}\n\nIf you weren't expecting this, ignore this email.`,
      });
    }

    console.log("[api/orgs/invite/bulk]", { orgId, invitedBy, count: created.length });
    return NextResponse.json({ ok: true, invited: created.length, invites: created });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
