export const runtime = "nodejs";
import "server-only";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const LIMIT = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5) || 5;

// Minimal HTML-entity decode (Google may return &#39;, &quot;, etc.)
function decodeEntities(s: string) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(s: string) {
  return decodeEntities(String(s))
    .replace(/\s*#\d+\s*$/i, "") // strip trailing "#123"
    .replace(/\u200B/g, "") // zero-width
    .trim();
}

async function translateWithGoogle(text: string, tgt: string, _src?: string) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("missing-google-key");

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: tgt }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "translate-failed");
  const raw = String(json?.data?.translations?.[0]?.translatedText || "");
  return cleanText(raw);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "");
    const text = String(body.text ?? "");
    const commit = Boolean(body.commit);
    const sender = String(body.sender || "agent");

    if (!code || !text) {
      return NextResponse.json(
        { error: "bad-request", detail: "Missing code or text" },
        { status: 400 }
      );
    }

    // Load session + normalize langs
    const sessionRef = adminDb.doc(`sessions/${code}`);
    const snap = await sessionRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "no-session" }, { status: 404 });
    }
    const tx = snap.get("translate") || {};
    const src = String(body.src || tx.agentLang || "en").toLowerCase();
    const tgt = String(body.tgt || tx.callerLang || "en").toLowerCase();

    // PREVIEW
    if (!commit) {
      // enforce free preview limit
      const used =
        Number(tx.previewCount ?? snap.get("translatePreviewCount") ?? 0) || 0;
      if (used >= LIMIT) {
        return NextResponse.json(
          { error: "preview-limit", previewsUsed: used, limit: LIMIT },
          { status: 429 }
        );
      }

      // same-language tolerance: echo text instead of hitting Google
      const translatedText =
        src === tgt ? cleanText(text) : await translateWithGoogle(text, tgt, src);

      // increment counters atomically
      await sessionRef.set(
        {
          translate: {
            previewCount: FieldValue.increment(1),
          },
          translatePreviewCount: FieldValue.increment(1), // legacy counter
          updatedAt: Timestamp.now(),
        } as any,
        { merge: true }
      );

      return NextResponse.json({
        ok: true,
        translatedText,
        src,
        tgt,
        previewsUsed: used + 1,
        limit: LIMIT,
      });
    }

    // COMMIT
    // same-language tolerance: if src === tgt, just send original text (no translate call)
    const translatedText =
      src === tgt ? cleanText(text) : await translateWithGoogle(text, tgt, src);

    const msgRef = adminDb
      .collection("sessions")
      .doc(code)
      .collection("messages")
      .doc();

    await msgRef.set({
      id: msgRef.id,
      role: sender, // 'agent' | 'caller'
      type: "text",
      text: translatedText,
      orig: { text: cleanText(text), lang: src },
      lang: { src, tgt },
      meta: { translated: src !== tgt }, // only mark translated when different
      createdAt: Timestamp.now(),
      createdAtMs: Date.now(),
    });

    // Metering (best-effort)
    // Check org.features.translateUnlimited by loading the org (if available)
    let unlimited =
      !!snap.get("org.features.translateUnlimited") ||
      !!snap.get("entitlements.translateUnlimited") ||
      snap.get("plan") === "translate-unlimited";

    const orgId = snap.get("orgId");
    if (!unlimited && orgId) {
      try {
        const orgSnap = await adminDb.collection("orgs").doc(String(orgId)).get();
        const orgUnlimited = !!orgSnap.data()?.features?.translateUnlimited;
        if (orgUnlimited) unlimited = true;
      } catch {}
    }

    let metered: string | undefined;
    if (unlimited) {
      metered = "skipped (unlimited)";
    } else if (src !== tgt) {
      // only bill when we actually translated
      try {
        await adminDb.collection("meter_backfill").add({
          at: Date.now(),
          code,
          kind: "translate",
          note: "meter later",
        });
        metered = "backfill";
      } catch {
        metered = "backfill";
      }
    }

    return NextResponse.json({ ok: true, translatedText, src, tgt, metered });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
