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
  const freeUsed = Number(sessionObj?.translate?.previewCount ?? sessionObj?.translatePreviewCount ?? 0);
  const freeLimit = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);
  // Two-box preview state
  const [previewIn, setPreviewIn] = useState("");
  const [previewOut, setPreviewOut] = useState("");
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const previewsUsed = Number(sessionObj?.translate?.previewCount ?? sessionObj?.translatePreviewCount ?? 0);
  const limit = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);

  async function previewOnce() {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sessionId,
        text: pvText,
        commit: false,
        src: sessionObj?.translate?.agentLang || "en",
        tgt: sessionObj?.translate?.callerLang || "en",
      }),
    });
    const j = await res.json();
    if (res.status === 429) { alert(`Free preview limit reached (${j.previewsUsed}/${j.limit})`); return; } if (!res.ok) return alert(j.error || "Preview failed");
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
        src: sessionObj?.translate?.agentLang,
        tgt: sessionObj?.translate?.callerLang,
      }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Send failed");
    setPvText(""); setPvOut(null);
  }

  
  async function doPreview() {
    setPreviewErr(null);
    setPreviewOut("");
    const src = (sessionObj?.translate?.agentLang || 'en').toLowerCase();
    const tgt = (sessionObj?.translate?.callerLang || 'en').toLowerCase();
    const res = await fetch('/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionId, text: previewIn.trim(), src, tgt, commit: false }),
    });
    let json: any = {};
    try { json = await res.json(); } catch {}
    if (!res.ok) {
      if (json?.error === 'preview-limit') {
        setPreviewErr(Free preview limit reached (/).);
      } else {
        setPreviewErr(Preview failed: );
      }
      return;
    }
    setPreviewOut(String(json.translatedText || ''));
  }

  async function sendAndBillFromPreview() {
    setPreviewErr(null);
    const text = previewIn.trim();
    if (!text) return;
    const src = (sessionObj?.translate?.agentLang || 'en').toLowerCase();
    const tgt = (sessionObj?.translate?.callerLang || 'en').toLowerCase();
    const res = await fetch('/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionId, text, src, tgt, commit: true, sender: 'agent' }),
    });
    let json: any = {};
    try { json = await res.json(); } catch {}
    if (!res.ok) { setPreviewErr(Send failed: ); return; }
    setPreviewIn('');
    setPreviewOut('');
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
          <label className="text-sm font-medium">Preview (input)</label>
          <textarea
            className="w-full mt-1 rounded-md border p-2"
            rows={2}
            placeholder="Type text to translate…"
            value={previewIn}
            onChange={(e) => setPreviewIn(e.target.value)}
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
              onClick={doPreview}
              disabled={!previewIn || previewsUsed >= limit}
              title={previewsUsed >= limit ? "Free preview limit reached" : ""}
            >
              Preview
            </button>

            <button
              type="button"
              className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={sendAndBillFromPreview}
              disabled={!previewIn}
            >
              Send to chat &amp; bill
            </button>

            <span className="ml-auto text-xs text-slate-500">
              Free previews used: {previewsUsed} / {limit}
            </span>
          </div>

          {previewErr && <div className="mt-2 text-xs text-red-600">{previewErr}</div>}

          <label className="mt-3 block text-sm font-medium">Preview (output)</label>
          <textarea
            className="w-full mt-1 rounded-md border p-2 bg-slate-50"
            rows={2}
            readOnly
            value={previewOut}
            placeholder="Translation will appear here…"
          />
        </div>{sessionObj?.translate?.requested && (
          <div className="mt-2 text-xs rounded-md bg-blue-50 text-blue-900 px-2 py-1">Caller requested translation</div>
        )}
      </section>
    </div>
  );
}







