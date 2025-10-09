export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db, bucket } from "@/lib/firebase-admin";
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

type PerCode = {
  code: string;
  deleted: { subcollections: number; doc: boolean; storageObjects: number };
  errors: string[]; // "subcollections: <msg>", "doc: <msg>", "storage: <msg>"
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
  const skipStorage = url.searchParams.get("skipStorage") === "1"; // Firestore-only
  const skipDb = url.searchParams.get("skipDb") === "1";           // Storage-only
  const codesParam = (url.searchParams.get("codes") || "").trim();
  const codesList = codesParam ? codesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!envKey) return j({ ok: false, error: "unauthorized", reason: "missing-env" }, 401);
  if (!key) return j({ ok: false, error: "unauthorized", reason: "missing-key" }, 401);
  if (!safeEqual(envKey, key)) return j({ ok: false, error: "unauthorized", reason: "mismatch" }, 401);

  try {
    const now = Timestamp.now();
    const cutoff = olderThanHours != null ? Timestamp.fromMillis(now.toMillis() - olderThanHours * 3600_000) : null;

    // ---------- 1) Candidate discovery ----------
    const codes = await collectCandidates({ cutoff, codesList, debug });

    // ---------- 2) Delete (or simulate) ----------
    const counts: Counts = {
      sessions: 0,
      subcollections: 0,
      storageObjects: 0,
      orphanPrefixesScanned: 0,
      orphanPrefixesDeleted: 0,
    };
    const perCode: PerCode[] = [];

    for (const code of codes) {
      const entry: PerCode = { code, deleted: { subcollections: 0, doc: false, storageObjects: 0 }, errors: [] };

      if (!dryRun) {
        // 2a) Subcollections
        try {
          if (!skipDb) {
            entry.deleted.subcollections = await deleteAllSubcollections(db, db.collection("sessions").doc(code));
            counts.subcollections += entry.deleted.subcollections;
          }
        } catch (e: any) {
          entry.errors.push(`subcollections: ${msg(e)}`);
        }

        // 2b) Session doc
        try {
          if (!skipDb) {
            await db.collection("sessions").doc(code).delete();
            entry.deleted.doc = true;
            counts.sessions++;
          }
        } catch (e: any) {
          entry.errors.push(`doc: ${msg(e)}`);
        }

        // 2c) Storage folder
        try {
          if (!skipStorage) {
            const n = await deleteStorageFolder(code);
            entry.deleted.storageObjects = n;
            counts.storageObjects += n;
          }
        } catch (e: any) {
          entry.errors.push(`storage: ${msg(e)}`);
        }
      }

      perCode.push(entry);
    }

    // ---------- 3) Orphan sweep ----------
    let orphanReport: { scanned: number; deleted: number } | null = null;
    if (sweepOrphans) {
      try {
        const { scanned, deleted } = await sweepOrphanUploads({ db, cutoff, dryRun, cap: ORPHAN_CAP });
        counts.orphanPrefixesScanned += scanned;
        counts.orphanPrefixesDeleted += deleted;
        orphanReport = { scanned, deleted };
      } catch (e: any) {
        // do not fail the whole job; surface in response
        orphanReport = { scanned: counts.orphanPrefixesScanned, deleted: counts.orphanPrefixesDeleted };
        perCode.push({ code: "[orphanSweep]", deleted: { subcollections: 0, doc: false, storageObjects: 0 }, errors: [`orphanSweep: ${msg(e)}`] });
      }
    }

    // ---------- 4) Log ----------
    if (!dryRun) {
      await db.collection("jobs").doc().set({
        type: "cleanup",
        ranAt: FieldValue.serverTimestamp(),
        candidates: codes.length,
        counts,
        params: { olderThanHours, sweepOrphans, codes: codesList, skipStorage, skipDb },
      });
    }

    return j({
      ok: true,
      dryRun,
      candidates: codes.length,
      counts,
      perCode,
      params: { olderThanHours, sweepOrphans, codes: codesList, skipStorage, skipDb },
      now: now.toDate().toISOString(),
    });
  } catch (e: any) {
    return j({ ok: false, error: "internal", reason: msg(e) }, 500);
  }
}

/* ---------------- helpers ---------------- */

function j(obj: any, status = 200) { return NextResponse.json(obj, { status }); }
function msg(e: any) { return String(e?.message || e); }
function numOrNull(s: string | null) { if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; }
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Collect candidate codes via expired/age/targeted, with safe fallbacks. */
async function collectCandidates(opts: { cutoff: Timestamp | null; codesList: string[]; debug: boolean; }): Promise<string[]> {
  const { cutoff, codesList, debug } = opts;
  const set = new Set<string>();

  // expired
  try {
    const now = Timestamp.now();
    const s = await db.collection("sessions").where("expiresAt", "<=", now).limit(SESSION_CAP).get();
    s.docs.forEach((d) => set.add(d.id));
  } catch (e) { if (debug) console.warn("expired query", e); }

  if (cutoff) {
    // closedAt <= cutoff (no composite index required)
    try {
      const s = await db.collection("sessions").where("closedAt", "<=", cutoff).orderBy("closedAt", "asc").limit(SESSION_CAP).get();
      s.docs.forEach((d) => set.add(d.id));
    } catch (e) { if (debug) console.warn("closedAt query", e); }

    // createdAt <= cutoff
    try {
      const s = await db.collection("sessions").where("createdAt", "<=", cutoff).orderBy("createdAt", "asc").limit(SESSION_CAP).get();
      s.docs.forEach((d) => set.add(d.id));
    } catch (e) { if (debug) console.warn("createdAt query", e); }

    // createTime fallback scan (for bare docs with no fields)
    try {
      const fp = FieldPath.documentId();
      let last: string | null = null;
      let scanned = 0;
      while (scanned < SESSION_CAP) {
        let q = db.collection("sessions").orderBy(fp).limit(500);
        if (last) q = q.startAfter(last);
        const page = await q.get();
        if (page.empty) break;
        for (const snap of page.docs) {
          const d = snap.data() || {};
          if (!d.createdAt && !d.closedAt && !d.expiresAt) {
            const metaCreate = (snap as any).createTime as Timestamp | undefined;
            if (metaCreate && cutoff && metaCreate.toMillis() <= cutoff.toMillis()) {
              set.add(snap.id);
            }
          }
        }
        scanned += page.size;
        last = page.docs[page.docs.length - 1].id;
        if (page.size < 500) break;
      }
    } catch (e) { if (debug) console.warn("createTime scan", e); }
  }

  // targeted
  codesList.forEach((c) => set.add(c));

  return Array.from(set).slice(0, SESSION_CAP);
}

/** Delete ALL subcollections under a doc (messages, fields, events, details, etc.). */
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

/** Delete uploads/{code}/** best-effort. */
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

/** Paginated orphan sweep using delimiter */
async function sweepOrphanUploads(params: { db: Firestore; cutoff: Timestamp | null; dryRun: boolean; cap: number }) {
  const { db, cutoff, dryRun, cap } = params;
  let pageToken: string | undefined;
  let scanned = 0, deleted = 0;

  while (scanned < cap) {
    const args: any = { prefix: "uploads/", delimiter: "/", autoPaginate: false, maxResults: Math.min(1000, cap - scanned) };
    if (pageToken) args.pageToken = pageToken;

    const res: any[] = await (bucket as any).getFiles(args);
    const apiResp: any = res[2] ?? res[1];
    const prefixes: string[] = (apiResp?.prefixes as string[]) ?? [];
    if (!prefixes.length) break;

    for (const p of prefixes) {
      if (scanned >= cap) break;
      const m = /^uploads\/(\d{6})\//.exec(p);
      if (!m) continue;
      const code = m[1];
      scanned++;

      const snap = await db.collection("sessions").doc(code).get();
      let should = false;
      if (!snap.exists) should = true;
      else if (cutoff) {
        const d = snap.data() || {};
        const createdAt = d.createdAt as Timestamp | undefined;
        const closedAt = d.closedAt as Timestamp | undefined;
        const metaCreate = (snap as any).createTime as Timestamp | undefined;
        if ((closedAt && closedAt.toMillis() <= cutoff.toMillis()) ||
            (createdAt && createdAt.toMillis() <= cutoff.toMillis()) ||
            (metaCreate && metaCreate.toMillis() <= cutoff.toMillis())) {
          should = true;
        }
      }
      if (should && !dryRun) deleted += await deleteStorageFolder(code);
    }

    pageToken = apiResp?.nextPageToken;
    if (!pageToken) break;
  }
  return { scanned, deleted };
}
