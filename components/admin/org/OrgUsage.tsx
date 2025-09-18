"use client";

import { collection, getCountFromServer, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function OrgUsage({ orgId }:{ orgId: string }){
  const [sessionsToday, setSessionsToday] = useState<number | null>(null);
  const [agentsActive, setAgentsActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run(){
      setLoading(true);
      const start = new Date();
      start.setHours(0,0,0,0);
      try {
        const sessionsRef = collection(db, "sessions");
        const q1 = query(
          sessionsRef,
          where("orgId", "==", orgId),
          where("createdAt", ">=", Timestamp.fromDate(start))
        );
        const c1 = await getCountFromServer(q1);
        setSessionsToday(c1.data().count);
      } catch { setSessionsToday(null); }
      try {
        setAgentsActive((sessionsToday ?? 0) > 0 ? 1 : 0);
      } catch { setAgentsActive(null); }
      setLoading(false);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return <div>Loading usage…</div>;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Sessions today" value={sessionsToday ?? "–"} />
        <Stat title="Agents active" value={agentsActive ?? "–"} />
        <Stat title="Avg duration" value="—" />
        <Stat title="Time-to-details" value="—" />
      </div>
      <p className="text-xs text-slate-500">Hook these to real queries/aggregations when ready. This card is a placeholder matching the MVP wireframe.</p>
    </div>
  );
}

function Stat({ title, value }:{ title: string; value: string | number }){
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
