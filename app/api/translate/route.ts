export const runtime = "nodejs";
import "server-only";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const LIMIT = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5) || 5;

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
  return String(json?.data?.translations?.[0]?.translatedText || "");
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

    if (!commit) {
      // PREVIEW: enforce limit, then translate and increment counters atomically
      const used = Number(tx.previewCount ?? snap.get("translatePreviewCount") ?? 0) || 0;
      if (used >= LIMIT) {
        return NextResponse.json(
          { error: "preview-limit", previewsUsed: used, limit: LIMIT },
          { status: 429 }
        );
      }

      const translatedText = await translateWithGoogle(text, tgt, src);

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

    // COMMIT: translate, then write message with dual fields
    const translatedText = await translateWithGoogle(text, tgt, src);

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
      orig: { text, lang: src },
      lang: { src, tgt },
      meta: { translated: true },
      createdAt: Timestamp.now(),
      createdAtMs: Date.now(),
    });

    // Metering (best-effort; optional)
    // If you have a helper already, call it here; otherwise omit to avoid noise.

    return NextResponse.json({ ok: true, translatedText, src, tgt });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

