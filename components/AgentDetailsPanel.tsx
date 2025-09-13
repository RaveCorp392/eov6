"use client";
import { useEffect, useMemo, useState } from "react";
import { watchDetails, saveDetails, requestAck, setTranslateConfig, watchSession, sendMessage } from "@/lib/firebase";

const LANGS = [
  { v: "en", l: "English" }, { v: "fr", l: "French" }, { v: "es", l: "Spanish" },
  { v: "de", l: "German" }, { v: "it", l: "Italian" }, { v: "pt", l: "Portuguese" },
];

export default function AgentDetailsPanel({ sessionId }: { sessionId: string }) {
  const [caller, setCaller] = useState<any>({});
  const [notes, setNotes] = useState("");
  const [tx, setTx] = useState<{ enabled?: boolean; agentLang?: string; callerLang?: string; previews?: number }>({});

  // hydrate caller + agent notes
  useEffect(() => watchDetails(sessionId, (d) => {
    setCaller(d || {});
    setNotes(d?.notes || "");
  }), [sessionId]);

  // hydrate translate config + preview count
  const [sessionObj, setSessionObj] = useState<any>(null);
  useEffect(() => watchSession(sessionId, (s) => {
    setSessionObj(s);
    setTx({
      enabled: s?.translate?.enabled ?? false,
      agentLang: s?.translate?.agentLang ?? "en",
      callerLang: s?.translate?.callerLang ?? "en",
      previews: s?.translatePreviewCount ?? 0,
    });
  }), [sessionId]);

  async function postSystem(text: string) {
    try { await sendMessage(sessionId, { sender: "agent", type: "system", text }); } catch {}
  }

  const debouncedSave = useMemo(() => {
    let t: any; return (value: string) => { clearTimeout(t); t = setTimeout(() => {
      saveDetails(sessionId, { notes: value });
    }, 500); };
  }, [sessionId]);

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Caller</h3>
        <div className="text-sm space-y-1">
          <div><span className="opacity-60 mr-1">Name:</span>{caller?.name || "—"}</div>
          <div><span className="opacity-60 mr-1">Email:</span>{caller?.email || "—"}</div>
          <div><span className="opacity-60 mr-1">Phone:</span>{caller?.phone || "—"}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Agent notes</h3>
        <textarea
          className="w-full rounded-md border p-2 min-h-[120px]"
          placeholder="Notes visible to agents only"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); debouncedSave(e.target.value); }}
        />
        <div className="mt-3">
          <button
            className="rounded-lg bg-amber-600 text-white px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-700"
            onClick={() => requestAck(sessionId, true)}
          >
            Send acknowledgement
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Live translate</h3>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!tx.enabled}
            onChange={async (e) => {
              const enabled = e.target.checked;
              await setTranslateConfig(sessionId, { enabled });
              const a = String(tx.agentLang || "en").toUpperCase();
              const c = String(tx.callerLang || "en").toUpperCase();
              await postSystem(`${enabled ? "Enabled" : "Disabled"} live translation (${a}↔${c}).`);
            }}
          />
          <span>Enable live translate (bi-directional)</span>
        </label>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1"
            value={tx.agentLang || "en"}
            onChange={async (e) => {
              const agentLang = e.target.value;
              await setTranslateConfig(sessionId, { agentLang });
              const a = String(agentLang).toUpperCase();
              const c = String(tx.callerLang || "en").toUpperCase();
              await postSystem(`Translation languages updated (${a}↔${c}).`);
            }}
          >
            {LANGS.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
          <span className="self-center opacity-60">↔</span>
          <select
            className="border rounded-md px-2 py-1"
            value={tx.callerLang || "en"}
            onChange={async (e) => {
              const callerLang = e.target.value;
              await setTranslateConfig(sessionId, { callerLang });
              const a = String(tx.agentLang || "en").toUpperCase();
              const c = String(callerLang).toUpperCase();
              await postSystem(`Translation languages updated (${a}↔${c}).`);
            }}
          >
            {LANGS.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
        </div>
        <div className="text-xs opacity-70 mt-2">Free previews used: {tx.previews ?? 0} / 5</div>
        {sessionObj?.translate?.requested && (
          <div className="mt-2 text-xs rounded-md bg-blue-50 text-blue-900 px-2 py-1">Caller requested translation</div>
        )}
      </section>
    </div>
  );
}
