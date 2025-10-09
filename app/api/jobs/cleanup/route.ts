export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db, bucket, getAdminApp } from "@/lib/firebase-admin";
import {
  Timestamp,
  FieldValue,
  Firestore,
  FieldPath,
  DocumentReference,
} from "firebase-admin/firestore";

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

  // New query knobs
  const olderThanHours = numOrNull(url.searchParams.get("olderThanHours")); // e.g. 24
  const sweepOrphans = url.searchParams.get("sweepOrphans") === "1";
  const codesParam = (url.searchParams.get("codes") || "").trim();
  const codesList = codesParam ? codesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Auth
  if (!envKey) return j({ ok: false, error: "unauthorized", reason: "missing-env" }, 401);
  if (!key) return j({ ok: false, error: "unauthorized", reason: "missing-key" }, 401);
  if (!safeEqual(envKey, key)) return j({ ok: false, error: "unauthorized", reason: "mismatch" }, 401);

  try {
    const now = Timestamp.now();
    const cutoff = olderThanHours != null ? Timestamp.fromMillis(now.toMillis() - olderThanHours * 3600_000) : null;

    // 1) Build a candidate set of codes
    const candidates = new Set<string>();

    // 1a) expired (original behavior)
    const expiredSnap = await db.collection("sessions").where("expiresAt", "<=", now).limit(SESSION_CAP).get();
    expiredSnap.docs.forEach((d) => candidates.add(d.id));
    const foundExpired = expiredSnap.size;

    // 1b) closed + old (if cutoff provided)
    let foundClosedStale = 0;
    if (cutoff) {
      const closedStale = await db.collection("sessions")
        .where("closed", "==", true)
        .where("closedAt", "<=", cutoff)
        .limit(SESSION_CAP)
        .get();
      closedStale.docs.forEach((d) => candidates.add(d.id));
      foundClosedStale = closedStale.size;

      // 1c) createdAt <= cutoff (sessions that never had expiresAt / closedAt)
      const createdStale = await db.collection("sessions")
        .where("createdAt", "<=", cutoff)
        .orderBy("createdAt", "asc")
        .limit(SESSION_CAP)
        .get();
      createdStale.docs.forEach((d) => candidates.add(d.id));
    }

    // 1d) doc createTime fallback for fieldless docs (like 110111)
    //     Iterate by documentId to avoid needing a field index
    if (cutoff) {
      const fp = FieldPath.documentId();
      let lastId: string | null = null;
      let scanned = 0;

      while (scanned < SESSION_CAP) {
        let q = db.collection("sessions").orderBy(fp).limit(500);
        if (lastId) q = q.startAfter(lastId);
        const page = await q.get();
        if (page.empty) break;

        for (const snap of page.docs) {
          // No fields? use createTime metadata, else use createdAt/closedAt already handled.
          const data = snap.data() || {};
          const hasCreatedAt = !!data.createdAt;
          const hasClosedAt = !!data.closedAt;
          const hasExpiresAt = !!data.expiresAt;
          if (!hasCreatedAt && !hasClosedAt && !hasExpiresAt) {
            // Use server metadata
            const metaCreate = (snap as any).createTime as Timestamp | undefined;
            if (metaCreate && cutoff && metaCreate.toMillis() <= cutoff.toMillis()) {
              candidates.add(snap.id);
            }
          }
        }
        scanned += page.size;
        lastId = page.docs[page.docs.length - 1].id;
        if (page.size < 500) break;
      }
    }

    // 1e) targeted codes
    codesList.forEach((c) => candidates.add(c));

    const finalCodes = Array.from(candidates).slice(0, SESSION_CAP);
    const counts: Counts = {
      sessions: 0,
      subcollections: 0,
      storageObjects: 0,
      orphanPrefixesScanned: 0,
      orphanPrefixesDeleted: 0,
    };

    const purgedCodes: string[] = [];

    // 2) Delete each candidate: delete ALL subcollections, then the doc, then storage
    for (const code of finalCodes) {
      if (!dryRun) {
        counts.subcollections += await deleteAllSubcollections(db, db.collection("sessions").doc(code));
        await db.collection("sessions").doc(code).delete().catch(() => {});
        counts.sessions++;
        counts.storageObjects += await deleteStorageFolder(code);
        purgedCodes.push(code);
      }
    }

    // 3) Optional orphan sweep of uploads/
    let orphanReport: { scanned: number; deleted: number } | null = null;
    if (sweepOrphans) {
      const { scanned, deleted } = await sweepOrphanUploads({ db, cutoff, dryRun, cap: ORPHAN_CAP });
      counts.orphanPrefixesScanned += scanned;
      counts.orphanPrefixesDeleted += deleted;
      orphanReport = { scanned, deleted };
    }

    // 4) Log a job record (only on live)
    if (!dryRun) {
      await db.collection("jobs").doc().set({
        type: "cleanup",
        ranAt: FieldValue.serverTimestamp(),
        foundExpired,
        foundClosedStale,
        candidates: finalCodes.length,
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
      candidates: finalCodes.length,
      purgedCodes,
      orphanSweep: orphanReport,
      counts,
      params: { olderThanHours, sweepOrphans, codes: codesList },
      now: now.toDate().toISOString(),
    });
  } catch (err: any) {
    console.error("cleanup error", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

/* ---------- helpers ---------- */

function j(obj: any, status = 200) {
  return NextResponse.json(obj, { status });
}
function numOrNull(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Deletes *all* subcollections under a session doc, regardless of name. */
async function deleteAllSubcollections(db: Firestore, docRef: DocumentReference): Promise<number> {
  const cols = await docRef.listCollections(); // e.g. messages, fields, events, details, profile
  let total = 0;
  for (const col of cols) {
    total += await deleteSubcollection(col.path, db);
  }
  return total;
}

async function deleteSubcollection(path: string, db: Firestore): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_LIMIT).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
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

async function sweepOrphanUploads(params: { db: Firestore; cutoff: Timestamp | null; dryRun: boolean; cap: number }) {
  const { db, cutoff, dryRun, cap } = params;
  const [files] = await bucket.getFiles({ prefix: "uploads/" });
  // Collect 6-digit codes from object names
  const counts = new Map<string, number>();
  for (const f of files) {
    const m = /^uploads\/(\d{6})\//.exec(f.name);
    if (m) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }

  let scanned = 0, deleted = 0;
  for (const [code] of counts) {
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
