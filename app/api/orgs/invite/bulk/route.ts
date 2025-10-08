export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "crypto";
import { getFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { normEmail } from "@/lib/email-normalize";

type InviteStatus = "pending" | "accepted" | "revoked";
type InviteDoc = {
  orgId: string;
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

    const domainsToAdd = new Set<string>();
    for (const raw of clean) {
      const normalized = normEmail(raw);
      const at = normalized.indexOf("@");
      if (at > 0) {
        const dom = normalized.slice(at + 1).toLowerCase().trim();
        if (dom) domainsToAdd.add(dom);
      }
    }

    const batch = db.batch();
    const created: Array<InviteDoc & { id: string }> = [];
    const now = Date.now();

    for (const raw of clean) {
      const token = randomUUID();
      const normalized = normEmail(raw);
      const ref = orgRef.collection("invites").doc(token);
      const data: InviteDoc = {
        orgId,
        email: raw,
        norm: normalized,
        status: "pending",
        invitedAt: now,
        invitedBy,
      };
      batch.set(ref, data, { merge: true });
      created.push({ id: token, ...data });
    }

    await batch.commit();

    if (domainsToAdd.size > 0) {
      const domainsArray = Array.from(domainsToAdd);
      try {
        await orgRef.update({ domains: FieldValue.arrayUnion(...domainsArray) });
      } catch {
        await orgRef.set({ domains: domainsArray }, { merge: true });
      }
    }

    const transporter = mailer();
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.eov6.com";
    const from = process.env.EMAIL_FROM || `EOV6 <${process.env.ZOHO_SMTP_USER}>`;
    const orgName = ((orgSnap.data() as any)?.name || orgId) as string;

    for (const invite of created) {
      const link = `${base}/onboard/claim?token=${encodeURIComponent(invite.id)}&org=${encodeURIComponent(orgId)}`;
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
