// components/AgentDetailsPanel.tsx
"use client";
import { useEffect, useState } from "react";
import { requestAck, saveDetails, watchDetails } from "@/lib/firebase";

export default function AgentDetailsPanel({ sessionId }: { sessionId: string }) {
  const [form, setForm] = useState({ name: "", notes: "" });

  useEffect(() => {
    const unsub = watchDetails(sessionId, (d) => setForm({ name: d?.name || "", notes: d?.notes || "" }));
    return () => unsub();
  }, [sessionId]);

  async function save(k: "name" | "notes", v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    await saveDetails(sessionId, { [k]: v });
  }

  async function sendAck() {
    await requestAck(sessionId, true);
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-3">
      <div>
        <div className="text-xs opacity-70">Caller name</div>
        <input
          value={form.name}
          onChange={(e) => save("name", e.target.value)}
          placeholder="Enter caller name"
          className="w-full mt-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1"
        />
      </div>
      <div>
        <div className="text-xs opacity-70">Agent notes</div>
        <textarea
          value={form.notes}
          onChange={(e) => save("notes", e.target.value)}
          placeholder="Notes visible to agents only"
          className="w-full mt-1 h-28 rounded-lg bg-white/5 border border-white/10 px-2 py-1"
        />
      </div>
      <button onClick={sendAck} className="rounded-lg px-3 py-2 bg-amber-400 text-black font-medium">
        Send acknowledgement
      </button>
    </div>
  );
}
