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

type FoundByRoot = Record<string, number>;

type PerCode = {
  code: string;
  found?: { byRoot: FoundByRoot; total: number };
  deleted: { subcollections: number; doc: boolean; storageObjects: number };
  errors: string[];
};

const BATCH_LIMIT = 250;
const PAGE_SIZE = 500;
const SESSION_CAP = Number(process.env.CLEANUP_MAX_SESSIONS || 5000);
const ORPHAN_CAP = Number(process.env.CLEANUP_ORPHAN_CAP || 1000);
const DEFAULT_STORAGE_PREFIXES = ["uploads", "sessions"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") || "").trim();
  const envKey = (process.env.CRON_SECRET || "").trim();

  const dryRun = url.searchParams.get("dryRun") === "1";
  const olderThanH = numOrNull(url.searchParams.get("olderThanHours"));
  const sweepOrphans = url.searchParams.get("sweepOrphans") === "1";
  const skipStorage = url.searchParams.get("skipStorage") === "1";
  const skipDb = url.searchParams.get("skipDb") === "1";
  const scanAll = url.searchParams.get("scanAll") === "1" || olderThanH != null;
  const storagePrefixes = parsePrefixes(url.searchParams.get("storagePrefixes")) ?? DEFAULT_STORAGE_PREFIXES;

  const codesParam = (url.searchParams.get("codes") || "").trim();
  const codesList = codesParam ? codesParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!envKey) return j({ ok: false, error: "unauthorized", reason: "missing-env" }, 401);
  if (!key) return j({ ok: false, error: "unauthorized", reason: "missing-key" }, 401);
  if (!safeEqual(envKey, key)) return j({ ok: false, error: "unauthorized", reason: "mismatch" }, 401);

  try {
    const now = Timestamp.now();
    const cutoff = olderThanH != null ? Timestamp.fromMillis(now.toMillis() - olderThanH * 3600_000) : null;
    const cutoffMs = cutoff ? cutoff.toMillis() : null;

    const codes = new Set<string>();
    codesList.forEach((c) => codes.add(c));

    if (cutoff) {
      try {
        const snap = await db.collection("sessions").where("expiresAt", "<=", cutoff).limit(SESSION_CAP).get();
        snap.docs.forEach((d) => codes.add(d.id));
      } catch {}
      try {
        const snap = await db.collection("sessions").where("closedAt", "<=", cutoff).orderBy("closedAt", "asc").limit(SESSION_CAP).get();
        snap.docs.forEach((d) => codes.add(d.id));
      } catch {}
      try {
        const snap = await db.collection("sessions").where("createdAt", "<=", cutoff).orderBy("createdAt", "asc").limit(SESSION_CAP).get();
        snap.docs.forEach((d) => codes.add(d.id));
      } catch {}
    }

    if (cutoffMs != null && scanAll) {
      const fp = FieldPath.documentId();
      let lastId: string | null = null;
      let scanned = 0;

      while (scanned < SESSION_CAP) {
        let q = db.collection("sessions").orderBy(fp).limit(PAGE_SIZE);
        if (lastId) q = q.startAfter(lastId);
        const page = await q.get();
        if (page.empty) break;

        for (const snap of page.docs) {
          const data = snap.data() || {};
          const msList = [
            toMillis(data.expiresAt),
            toMillis(data.closedAt),
            toMillis(data.createdAt),
            toMillis((snap as any).createTime as Timestamp | undefined),
          ].filter((n): n is number => typeof n === "number");

          const earliest = msList.length ? Math.min(...msList) : null;
          if (earliest != null && earliest <= cutoffMs) {
            codes.add(snap.id);
          }
        }

        scanned += page.size;
        lastId = page.docs[page.docs.length - 1].id;
        if (page.size < PAGE_SIZE) break;
      }
    }

    const candidateCodes = Array.from(codes).slice(0, SESSION_CAP);

    const counts: Counts = {
      sessions: 0,
      subcollections: 0,
      storageObjects: 0,
      orphanPrefixesScanned: 0,
      orphanPrefixesDeleted: 0,
    };
    const perCode: PerCode[] = [];

    for (const code of candidateCodes) {
      const entry: PerCode = { code, deleted: { subcollections: 0, doc: false, storageObjects: 0 }, errors: [] };

      try {
        const found = await countStorageForCode(code, storagePrefixes);
        const total = Object.values(found).reduce((a, b) => a + b, 0);
        entry.found = { byRoot: found, total };
      } catch (e: any) {
        entry.errors.push(`inspect: ${msg(e)}`);
      }

      if (!dryRun) {
        if (!skipDb) {
          try {
            entry.deleted.subcollections = await deleteAllSubcollections(db, db.collection("sessions").doc(code));
            counts.subcollections += entry.deleted.subcollections;
          } catch (e: any) {
            entry.errors.push(`subcollections: ${msg(e)}`);
          }

          try {
            await db.collection("sessions").doc(code).delete();
            entry.deleted.doc = true;
            counts.sessions++;
          } catch (e: any) {
            entry.errors.push(`doc: ${msg(e)}`);
          }
        }

        if (!skipStorage) {
          try {
            const removed = await deleteStoragePrefixesForCode(code, storagePrefixes, true);
            entry.deleted.storageObjects = removed;
            counts.storageObjects += removed;
          } catch (e: any) {
            entry.errors.push(`storage: ${msg(e)}`);
          }
        }
      }

      perCode.push(entry);
    }

    if (sweepOrphans) {
      try {
        const { scanned, deleted } = await sweepOrphanUploads({ db, cutoff, dryRun, cap: ORPHAN_CAP, roots: storagePrefixes });
        counts.orphanPrefixesScanned += scanned;
        counts.orphanPrefixesDeleted += deleted;
      } catch (e: any) {
        perCode.push({ code: "[orphanSweep]", deleted: { subcollections: 0, doc: false, storageObjects: 0 }, errors: [`orphanSweep: ${msg(e)}`] });
      }
    }

    if (!dryRun) {
      await db.collection("jobs").doc().set({
        type: "cleanup",
        ranAt: FieldValue.serverTimestamp(),
        candidates: candidateCodes.length,
        counts,
        params: { olderThanHours: olderThanH, sweepOrphans, skipDb, skipStorage, storagePrefixes },
      });
    }

    return j({
      ok: true,
      dryRun,
      candidates: candidateCodes.length,
      counts,
      perCode,
      params: { olderThanHours: olderThanH, sweepOrphans, skipDb, skipStorage, storagePrefixes },
    });
  } catch (e: any) {
    return j({ ok: false, error: "internal", reason: msg(e) }, 500);
  }
}

function j(obj: any, status = 200) {
  return NextResponse.json(obj, { status });
}
function msg(e: any) {
  return String(e?.message || e);
}
function numOrNull(s: string | null) {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function parsePrefixes(s: string | null) {
  if (!s) return null;
  const a = s.split(",").map((x) => x.trim()).filter(Boolean);
  return a.length ? a : null;
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function toMillis(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") {
    return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
  }
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
    const d = Date.parse(v);
    return Number.isFinite(d) ? d : null;
  }
  if (typeof v === "object" && typeof v?.toMillis === "function") {
    try {
      return v.toMillis();
    } catch {
      return null;
    }
  }
  return null;
}
async function countStorageForCode(code: string, roots: string[]): Promise<FoundByRoot> {
  const out: FoundByRoot = {};
  for (const root of roots) {
    const prefix = `${root.replace(/\/+$/, "")}/${code}/`;
    const [files] = await bucket.getFiles({ prefix });
    out[root] = files.length;
  }
  return out;
}
async function deleteStoragePrefixesForCode(code: string, roots: string[], deletePlaceholder: boolean): Promise<number> {
  let total = 0;
  for (const root of roots) {
    const cleanRoot = root.replace(/\/+$/, "");
    const prefix = `${cleanRoot}/${code}/`;
    const [files] = await bucket.getFiles({ prefix });
    for (let i = 0; i < files.length; i += BATCH_LIMIT) {
      const chunk = files.slice(i, i + BATCH_LIMIT);
      await Promise.all(
        chunk.map(async (f) => {
          try {
            await f.delete();
          } catch {}
        })
      );
      total += chunk.length;
    }
    if (deletePlaceholder) {
      try {
        await bucket.file(`${cleanRoot}/${code}/`).delete({ ignoreNotFound: true } as any);
      } catch {}
    }
  }
  return total;
}
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
async function sweepOrphanUploads(params: { db: Firestore; cutoff: Timestamp | null; dryRun: boolean; cap: number; roots: string[] }) {
  const { db, cutoff, dryRun, cap, roots } = params;
  let scanned = 0;
  let deleted = 0;

  for (const root of roots) {
    let pageToken: string | undefined;
    while (scanned < cap) {
      const args: any = {
        prefix: `${root.replace(/\/+$/, "")}/`,
        delimiter: "/",
        autoPaginate: false,
        maxResults: Math.min(1000, cap - scanned),
      };
      if (pageToken) args.pageToken = pageToken;

      const res: any[] = await (bucket as any).getFiles(args);
      const apiResp: any = res[2] ?? res[1];
      const prefixes: string[] = (apiResp?.prefixes as string[]) ?? [];
      if (!prefixes.length) break;

      for (const p of prefixes) {
        if (scanned >= cap) break;
        const m = new RegExp(`^${root.replace(/\/+$/, "")}/(\d{6})/`).exec(p);
        if (!m) continue;
        const code = m[1];
        scanned++;

        const snap = await db.collection("sessions").doc(code).get();
        let should = false;
        if (!snap.exists) {
          should = true;
        } else if (cutoff) {
          const data = snap.data() || {};
          const createdAt = toMillis(data.createdAt);
          const closedAt = toMillis(data.closedAt);
          const metaCreate = toMillis((snap as any).createTime as Timestamp | undefined);
          if (
            (closedAt && closedAt <= cutoff.toMillis()) ||
            (createdAt && createdAt <= cutoff.toMillis()) ||
            (metaCreate && metaCreate <= cutoff.toMillis())
          ) {
            should = true;
          }
        }
        if (should && !dryRun) {
          deleted += await deleteStoragePrefixesForCode(code, [root], true);
        }
      }

      pageToken = apiResp?.nextPageToken;
      if (!pageToken) break;
    }
  }
  return { scanned, deleted };
}
