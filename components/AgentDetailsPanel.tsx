"use client";
import { useEffect, useMemo, useState } from "react";
import { watchDetails, saveDetails, requestAck, setTranslateConfig, watchSession, sendMessage } from "@/lib/firebase";

import { LANGUAGES } from "@/lib/languages";
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
  // Preview state
  const [pvText, setPvText] = useState("");
  const [pvOut, setPvOut] = useState<string | null>(null);
  const freeUsed = Number(sessionObj?.translatePreviewCount ?? 0);
  const freeLimit = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);

  async function previewOnce() {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sessionId,
        text: pvText,
        commit: false,
        target: sessionObj?.translate?.callerLang || "en",
      }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Preview failed");
    setPvOut(j.translatedText || "");
  }

  async function sendAndBill() {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sessionId,
        text: pvText,
        commit: true,
        sender: "agent",
        agentLang: sessionObj?.translate?.agentLang,
        callerLang: sessionObj?.translate?.callerLang,
      }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Send failed");
    setPvText(""); setPvOut(null);
  }

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
          <div><span className="opacity-60 mr-1">Name:</span>{caller?.name || "â€”"}</div>
          <div><span className="opacity-60 mr-1">Email:</span>{caller?.email || "â€”"}</div>
          <div><span className="opacity-60 mr-1">Phone:</span>{caller?.phone || "â€”"}</div>
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
              await postSystem(`${enabled ? "Enabled" : "Disabled"} live translation (${a}â†”${c}).`);
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
              await postSystem(`Translation languages updated (${a}â†”${c}).`);
            }}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <span className="self-center opacity-60">â†”</span>
          <select
            className="border rounded-md px-2 py-1"
            value={tx.callerLang || "en"}
            onChange={async (e) => {
              const callerLang = e.target.value;
              await setTranslateConfig(sessionId, { callerLang });
              const a = String(tx.agentLang || "en").toUpperCase();
              const c = String(callerLang).toUpperCase();
              await postSystem(`Translation languages updated (${a}â†”${c}).`);
            }}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="mt-1">
          <button
            type="button"
            className="text-xs underline text-slate-600 hover:text-slate-900"
            onClick={async () => {
              const code = (navigator?.language || "en").slice(0,2).toLowerCase();
              const valid = LANGUAGES.some(l => l.code === code);
              if (!valid) return;
              await setTranslateConfig(sessionId, { agentLang: code });
            }}
          >
            Use my browser language
          </button>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium">Preview</label>
          <textarea className="mt-1 w-full rounded-md border px-2 py-1" rows={3}
            placeholder="Type text to preview…" value={pvText} onChange={e => setPvText(e.target.value)} />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Free previews used: {freeUsed} / {freeLimit}</span>
            <button className="rounded bg-slate-800 text-white text-sm px-2 py-1 disabled:opacity-50"
              disabled={!pvText.trim() || freeUsed >= freeLimit} onClick={previewOnce}>Preview</button>
            <button className="rounded bg-emerald-600 text-white text-sm px-2 py-1 disabled:opacity-50"
              disabled={!pvOut} onClick={sendAndBill}>Send to chat & bill</button>
          </div>
          {pvOut && <div className="mt-2 text-sm rounded border bg-slate-50 p-2 whitespace-pre-wrap">{pvOut}</div>}
        </div>
                {sessionObj?.translate?.requested && (
          <div className="mt-2 text-xs rounded-md bg-blue-50 text-blue-900 px-2 py-1">Caller requested translation</div>
        )}
      </section>
    </div>
  );
}




