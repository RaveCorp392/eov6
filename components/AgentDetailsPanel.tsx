"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type Props = { code: string };

type Caller = {
  fullName?: string;
  email?: string;
  phone?: string;
  identified?: boolean;
};

export default function AgentDetailsPanel({ code }: Props) {
  const [caller, setCaller] = useState<Caller | null>(null);

  useEffect(() => {
    // Listen to sessions/{code}/meta/caller
    const ref = doc(db, "sessions", code, "meta", "caller");
    const unsub = onSnapshot(ref, (snap) => {
      setCaller(snap.exists() ? (snap.data() as Caller) : null);
    });
    return () => unsub();
  }, [code]);

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-white/90">Caller details</h3>
      <div className="text-sm leading-6 text-white/80">
        <div>Name — {caller?.fullName ?? "— —"}</div>
        <div>Email — {caller?.email ?? "— —"}</div>
        <div>Phone — {caller?.phone ?? "— —"}</div>
        <div>Identified — {caller?.identified ? "Yes" : "No"}</div>
      </div>
    </section>
  );
}
