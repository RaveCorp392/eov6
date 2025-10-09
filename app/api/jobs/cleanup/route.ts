export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db, bucket } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type CleanCounts = { sessions: number; messages: number; fields: number; storageObjects: number; };
const BATCH_LIMIT = 250;
const SESSION_CAP = Number(process.env.CLEANUP_MAX_SESSIONS || 2000);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provided = (searchParams.get("key") || "").trim();
  const envKey = (process.env.CRON_SECRET || "").trim();
  const dryRun = searchParams.get("dryRun") === "1";

  if (!envKey) return NextResponse.json({ ok:false, error:"unauthorized", reason:"missing-env" }, { status:401 });
  if (!provided) return NextResponse.json({ ok:false, error:"unauthorized", reason:"missing-key" }, { status:401 });
  if (!safeEqual(envKey, provided)) {
    return NextResponse.json({ ok:false, error:"unauthorized", reason:"mismatch", envLen: envKey.length, providedLen: provided.length }, { status:401 });
  }

  try {
    const now = Timestamp.now();
    const snap = await db.collection("sessions").where("expiresAt", "<=", now).limit(SESSION_CAP).get();

    const counts: CleanCounts = { sessions:0, messages:0, fields:0, storageObjects:0 };
    const purgedCodes: string[] = [];

    for (const doc of snap.docs) {
      const code = doc.id;
      purgedCodes.push(code);
      if (!dryRun) {
        counts.messages += await deleteSub(`sessions/${code}/messages`);
        counts.fields   += await deleteSub(`sessions/${code}/fields`);
        await doc.ref.delete();
        counts.sessions++;
        counts.storageObjects += await deleteFolder(code);
      }
    }

    if (!dryRun) {
      await db.collection("jobs").doc().set({
        type:"cleanup", ranAt: FieldValue.serverTimestamp(),
        expiredCount: snap.size, purgedCodes, counts
      });
    }

    return NextResponse.json({ ok:true, dryRun, expiredSessionsFound: snap.size, purgedCodes, counts, cap: SESSION_CAP, now: now.toDate().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: String(err?.message || err) }, { status:500 });
  }
}

async function deleteSub(path: string): Promise<number> {
  const col = db.collection(path);
  let deleted = 0;
  while (true) {
    const page = await col.limit(BATCH_LIMIT).get();
    if (page.empty) break;
    const batch = db.batch();
    page.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += page.size;
  }
  return deleted;
}

async function deleteFolder(code: string): Promise<number> {
  const prefix = `uploads/${code}/`;
  const [files] = await bucket.getFiles({ prefix });
  if (!files.length) return 0;
  let deleted = 0;
  for (let i = 0; i < files.length; i += BATCH_LIMIT) {
    await Promise.all(files.slice(i, i+BATCH_LIMIT).map(async f => { try { await f.delete(); } catch {} }));
    deleted += Math.min(BATCH_LIMIT, files.length - i);
  }
  return deleted;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i=0;i<a.length;i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
