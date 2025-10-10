import { db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

function fmt(n?: number) {
  return typeof n === "number" ? n.toLocaleString() : "-";
}

function fmtDate(d?: Date | null) {
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function JobsCard() {
  const snap = await db
    .collection("jobs")
    .where("type", "==", "cleanup")
    .orderBy("ranAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold">Cleanup status</h3>
        <p className="mt-2 text-sm text-slate-600">No cleanup runs found yet.</p>
      </div>
    );
  }

  const doc = snap.docs[0];
  const data = doc.data() as any;
  const ranAtTS = data?.ranAt as Timestamp | undefined;
  const ranAt = ranAtTS ? ranAtTS.toDate() : null;
  const counts = data?.counts ?? {};
  const params = data?.params ?? {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Cleanup status</h3>
        <span className="text-xs text-slate-500">Job ID: {doc.id.slice(0, 6)}...</span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <dt className="text-xs text-slate-500">Ran at</dt>
          <dd className="mt-1 text-sm font-medium">{fmtDate(ranAt)}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <dt className="text-xs text-slate-500">Sessions deleted</dt>
          <dd className="mt-1 text-sm font-medium">{fmt(counts.sessions)}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <dt className="text-xs text-slate-500">Subcollections</dt>
          <dd className="mt-1 text-sm font-medium">{fmt(counts.subcollections)}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <dt className="text-xs text-slate-500">Storage objects</dt>
          <dd className="mt-1 text-sm font-medium">{fmt(counts.storageObjects)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
          olderThanHours: {params?.olderThanHours ?? "-"}
        </span>
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
          sweepOrphans: {String(params?.sweepOrphans ?? "-")}
        </span>
        {params?.skipDb !== undefined && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
            skipDb: {String(params?.skipDb)}
          </span>
        )}
        {params?.skipStorage !== undefined && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
            skipStorage: {String(params?.skipStorage)}
          </span>
        )}
      </div>
    </div>
  );
}
