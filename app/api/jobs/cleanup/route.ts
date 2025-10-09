export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db, bucket } from "@/lib/firebase-admin";
import { Timestamp, FieldValue, Firestore, FieldPath, DocumentReference } from "firebase-admin/firestore";

type Counts = {
  sessions: number;
  subcollections: number;
  storageObjects: number;
  orphanPrefixesScanned: number;
  orphanPrefixesDeleted: number;
};

const BATCH_LIMIT = 250;
const SESSION_CAP = Number(process.env.CLEANUP_MAX_SESSIONS || 2000);
const ORPHAN_CAP = Number(process.env.CLEANUP_ORPHAN_CAP || 200);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") || "").trim();
  const envKey = (process.env.CRON_SECRET || "").trim();

  const dryRun = url.searchParams.get("dryRun") === "1";
  const olderThanHours = numOrNull(url.searchParams.get("olderThanHours"));
  const sweepOrphans = url.searchParams.get("sweepOrphans") === "1";
  const debug = url.searchParams.get("debug") === "1";
  const codesParam = (url.searchParams.get("codes") || "").trim();
  const codesList = codesParam ? codesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!envKey) return j({ ok: false, error: "unauthorized", reason: "missing-env" }, 401);
  if (!key) return j({ ok: false, error: "unauthorized", reason: "missing-key" }, 401);
  if (!safeEqual(envKey, key)) return j({ ok: false, error: "unauthorized", reason: "mismatch" }, 401);

  const now = Timestamp.now();
  const cutoff = olderThanHours != null ? Timestamp.fromMillis(now.toMillis() - olderThanHours * 3600_000) : null;

  try {
    // 1) Build candidate set
    const candidateCodes = new Set<string>();

    // 1a) expired (keep original behavior)
    let foundExpired = 0;
    try {
      const expiredSnap = await db.collection("sessions").where("expiresAt", "<=", now).limit(SESSION_CAP).get();
      expiredSnap.docs.forEach((d) => candidateCodes.add(d.id));
      foundExpired = expiredSnap.size;
    } catch (e) {
      if (debug) console.warn("expired query failed", e);
    }

    // 1b) closed + old — avoid composite index; use closedAt only
    let foundClosedStale = 0;
    if (cutoff) {
      try {
        const closedStale = await db.collection("sessions")
          .where("closedAt", "<=", cutoff)
          .orderBy("closedAt", "asc")
          .limit(SESSION_CAP)
          .get();
        closedStale.docs.forEach((d) => candidateCodes.add(d.id));
        foundClosedStale = closedStale.size;
      } catch (e) {
        if (debug) console.warn("closedAt query failed", e);
      }

      // 1c) createdAt <= cutoff (covers sessions that never set expiresAt/closedAt)
      try {
        const createdStale = await db.collection("sessions")
          .where("createdAt", "<=", cutoff)
          .orderBy("createdAt", "asc")
          .limit(SESSION_CAP)
          .get();
        createdStale.docs.forEach((d) => candidateCodes.add(d.id));
      } catch (e) {
        if (debug) console.warn("createdAt query failed", e);
      }

      // 1d) doc createTime fallback for docs with no fields (e.g., bare code docs)
      try {
        const fp = FieldPath.documentId();
        let lastId: string | null = null;
        let scanned = 0;
        while (scanned < SESSION_CAP) {
          let q = db.collection("sessions").orderBy(fp).limit(500);
          if (lastId) q = q.startAfter(lastId);
          const page = await q.get();
          if (page.empty) break;
          for (const snap of page.docs) {
            const d = snap.data() || {};
            if (!d.createdAt && !d.closedAt && !d.expiresAt) {
              const metaCreate = (snap as any).createTime as Timestamp | undefined;
              if (metaCreate && cutoff && metaCreate.toMillis() <= cutoff.toMillis()) {
                candidateCodes.add(snap.id);
              }
            }
          }
          scanned += page.size;
          lastId = page.docs[page.docs.length - 1].id;
          if (page.size < 500) break;
        }
      } catch (e) {
        if (debug) console.warn("createTime scan failed", e);
      }
    }

    // 1e) targeted codes
    codesList.forEach((c) => candidateCodes.add(c));

    const codes = Array.from(candidateCodes).slice(0, SESSION_CAP);

    // 2) Delete (or simulate)
    const counts: Counts = {
      sessions: 0,
      subcollections: 0,
      storageObjects: 0,
      orphanPrefixesScanned: 0,
      orphanPrefixesDeleted: 0,
    };
    const purgedCodes: string[] = [];

    for (const code of codes) {
      if (!dryRun) {
        counts.subcollections += await deleteAllSubcollections(db, db.collection("sessions").doc(code));
        await db.collection("sessions").doc(code).delete().catch(() => {});
        counts.sessions++;
        counts.storageObjects += await deleteStorageFolder(code);
        purgedCodes.push(code);
      }
    }

    // 3) Orphan sweep using delimiter for fast “folder” listing
    let orphanReport: { scanned: number; deleted: number } | null = null;
    if (sweepOrphans) {
      const { scanned, deleted } = await sweepOrphanUploads({ db, cutoff, dryRun, cap: ORPHAN_CAP });
      counts.orphanPrefixesScanned += scanned;
      counts.orphanPrefixesDeleted += deleted;
      orphanReport = { scanned, deleted };
    }

    if (!dryRun) {
      await db.collection("jobs").doc().set({
        type: "cleanup",
        ranAt: FieldValue.serverTimestamp(),
        foundExpired,
        foundClosedStale,
        candidates: codes.length,
        purgedCodes,
        orphanSweep: orphanReport,
        counts,
      });
    }

    return j({
      ok: true,
      dryRun,
      foundExpired,
      foundClosedStale,
      candidates: codes.length,
      purgedCodes: dryRun ? [] : purgedCodes,
      counts,
      params: { olderThanHours, sweepOrphans, codes: codesList },
      now: now.toDate().toISOString(),
    });
  } catch (err: any) {
    return j({ ok: false, error: "internal", reason: String(err?.message || err) }, 500);
  }
}

/* ---------- helpers ---------- */

function j(obj: any, status = 200) { return NextResponse.json(obj, { status }); }
function numOrNull(s: string | null) { if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; }
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Delete *all* subcollections under a doc, regardless of name. */
async function deleteAllSubcollections(db: Firestore, docRef: DocumentReference): Promise<number> {
  const cols = await docRef.listCollections();
  let total = 0;
  for (const col of cols) total += await deleteSubcollection(db, col.path);
  return total;
}
async function deleteSubcollection(db: Firestore, path: string): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_LIMIT).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}
async function deleteStorageFolder(code: string): Promise<number> {
  const prefix = `uploads/${code}/`;
  const [files] = await bucket.getFiles({ prefix });
  if (!files.length) return 0;
  let deleted = 0;
  for (let i = 0; i < files.length; i += BATCH_LIMIT) {
    const chunk = files.slice(i, i + BATCH_LIMIT);
    await Promise.all(chunk.map(async (f) => { try { await f.delete(); } catch {} }));
    deleted += chunk.length;
  }
  return deleted;
}

/** Fast orphan finder: list "folders" under uploads/ using delimiter, then check session docs. */
async function sweepOrphanUploads(params: { db: Firestore; cutoff: Timestamp | null; dryRun: boolean; cap: number }) {
  const { db, cutoff, dryRun, cap } = params;
  const [files, , apiResponse] = await bucket.getFiles({ prefix: "uploads/", delimiter: "/" });
  const prefixes: string[] = (apiResponse && (apiResponse as any).prefixes) || [];
  // prefixes look like "uploads/110111/" → extract codes
  const codes = prefixes.map((p) => (p.match(/^uploads\/(\d{6})\//)?.[1])).filter(Boolean) as string[];

  let scanned = 0, deleted = 0;
  for (const code of codes) {
    if (scanned >= cap) break;
    scanned++;
    const ref = db.collection("sessions").doc(code);
    const snap = await ref.get();
    let shouldPurge = false;
    if (!snap.exists) {
      shouldPurge = true;
    } else if (cutoff) {
      const d = snap.data() || {};
      const createdAt = d.createdAt as Timestamp | undefined;
      const closedAt = d.closedAt as Timestamp | undefined;
      const metaCreate = (snap as any).createTime as Timestamp | undefined;
      if ((closedAt && closedAt.toMillis() <= cutoff.toMillis()) ||
          (createdAt && createdAt.toMillis() <= cutoff.toMillis()) ||
          (metaCreate && metaCreate.toMillis() <= cutoff.toMillis())) {
        shouldPurge = true;
      }
    }
    if (shouldPurge && !dryRun) {
      deleted += await deleteStorageFolder(code);
    }
  }
  return { scanned, deleted };
}
