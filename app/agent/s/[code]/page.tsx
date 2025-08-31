"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function AgentConsolePage() {
  const params = useParams<{ code: string }>();
  const sessionId = params.code;

  const [details, setDetails] = useState<{ name?: string; email?: string; phone?: string } | null>(null);

  useEffect(() => {
    const ref = doc(db, "sessions", sessionId, "metadata", "details");
    const unsub = onSnapshot(ref, (snap) => setDetails(snap.data() as any ?? null));
    return () => unsub();
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-5xl p-4 text-[#e6eefb]">
      <h1 className="mb-3 text-xl font-semibold">Agent console</h1>

      <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <h2 className="mb-2 text-sm font-semibold text-white/80">Caller details</h2>
        {details ? (
          <ul className="text-sm leading-6 text-white/90">
            <li><span className="text-white/60">Name:</span> {details.name || "—"}</li>
            <li><span className="text-white/60">Email:</span> {details.email || "—"}</li>
            <li><span className="text-white/60">Phone:</span> {details.phone || "—"}</li>
          </ul>
        ) : (
          <p className="text-sm text-white/60">No details yet.</p>
        )}
      </section>

      <ChatWindow sessionId={sessionId} role="AGENT" />
    </main>
  );
}
