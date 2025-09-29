"use client";
import { useEffect, useMemo, useState } from "react";
import {
  watchDetails,
  watchSession,
  sendMessage,
  setTranslateConfig,
  LANGUAGES,
  normLang2,
  db,
} from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import AckMenu from "@/components/ack/AckMenu";

export default function AgentDetailsPanel({ sessionId, membershipReady = false }: { sessionId: string; membershipReady?: boolean }) {
  const [caller, setCaller] = useState<any>({});
  const [notes, setNotes] = useState("");
  const [sessionObj, setSessionObj] = useState<any>(null);

  // hydrate caller + agent notes
  useEffect(
    () =>
      watchDetails(sessionId, (d) => {
        setCaller(d || {});
      }),
    [sessionId]
  );

  useEffect(() => {
    const notesRef = doc(db, "sessions", sessionId, "details", "agent");
    const unsub = onSnapshot(notesRef, (snap) => {
      const data = snap.data();
      setNotes(typeof data?.notes === "string" ? data.notes : "");
    });
    return () => unsub();
  }, [sessionId]);

  // hydrate translate config + preview count
  useEffect(() => watchSession(sessionId, (s) => setSessionObj(s)), [sessionId]);

  // Two-box preview state
  const [previewIn, setPreviewIn] = useState("");
  const [previewOut, setPreviewOut] = useState("");
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  const agentLang = normLang2(sessionObj?.translate?.agentLang || "en");
  const callerLang = normLang2(sessionObj?.translate?.callerLang || "en");

  const previewsUsed = Number(
    sessionObj?.translate?.previewCount ?? sessionObj?.translatePreviewCount ?? 0
  );
  const limit = Number(process.env.NEXT_PUBLIC_TRANSLATE_FREE_PREVIEWS ?? 5);

  // Billing/UI derives
  const orgUnlimited = !!sessionObj?.org?.features?.translateUnlimited;
  const userUnlimited =
    !!sessionObj?.entitlements?.translateUnlimited ||
    sessionObj?.plan === "translate-unlimited";
  const shouldBill = !(orgUnlimited || userUnlimited); // bill only when nobody has unlimited

  const debouncedSave = useMemo(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const notesRef = doc(db, "sessions", sessionId, "details", "agent");
    return (value: string) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        void setDoc(
          notesRef,
          { notes: value, updatedAt: Date.now() },
          { merge: true }
        );
      }, 500);
    };
  }, [sessionId]);

  async function saveTranslateEnabled(enabled: boolean) {
    await setTranslateConfig(sessionId, {
      enabled,
      agentLang,
      callerLang,
    });
  }

  async function saveAgentLang(code: string) {
    await setTranslateConfig(sessionId, { agentLang: normLang2(code) });
  }

  async function saveCallerLang(code: string) {
    await setTranslateConfig(sessionId, { callerLang: normLang2(code) });
  }

  async function useBrowserLang() {
    const b = normLang2(typeof navigator !== "undefined" ? navigator.language : "en");
    await setTranslateConfig(sessionId, { agentLang: b });
  }

  async function doPreview() {
    setPreviewErr(null);
    setPreviewOut("");
    const src = agentLang;
    const tgt = callerLang;
    const text = previewIn.trim();
    if (!text) return;

    // If same-language, echo locally (avoid Google "Bad language pair")
    if (src === tgt) {
      setPreviewOut(text);
      return;
    }

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: sessionId, text, src, tgt, commit: false }),
    });

    let json: any = {};
    try {
      json = await res.json();
    } catch {}

    if (!res.ok) {
      if (json?.error === "preview-limit") {
        setPreviewErr(`Free preview limit reached (${json.previewsUsed}/${json.limit}).`);
      } else {
        setPreviewErr(`Preview failed: ${json?.error || res.status}`);
      }
      return;
    }
    setPreviewOut(String(json.translatedText || ""));
  }

  async function sendAndBillFromPreview() {
    setPreviewErr(null);
    const src = agentLang;
    const tgt = callerLang;
    const text = previewIn.trim();
    if (!text) return;

    // Same-language: just send original (no billing)
    if (src === tgt) {
      await sendMessage(sessionId, { sender: "agent", text });
      setPreviewIn("");
      setPreviewOut("");
      return;
    }

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sessionId,
        text,
        src,
        tgt,
        commit: true,
        sender: "agent",
      }),
    });

    let json: any = {};
    try {
      json = await res.json();
    } catch {}
    if (!res.ok) {
      setPreviewErr(`Send failed: ${json?.error || res.status}`);
      return;
    }
    setPreviewIn("");
    setPreviewOut("");
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Caller</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="opacity-60 mr-1">Name:</span>
            {caller?.name || "—"}
          </div>
          <div>
            <span className="opacity-60 mr-1">Email:</span>
            {caller?.email || "—"}
          </div>
          <div>
            <span className="opacity-60 mr-1">Phone:</span>
            {caller?.phone || "—"}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="font-medium mb-2">Agent notes</h3>
        <textarea
          className="w-full rounded-md border p-2 min-h-[120px]"
          placeholder="Notes visible to agents only"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            debouncedSave(e.target.value);
          }}
        />
        <div className="mt-3">
          <AckMenu code={sessionId} orgId={sessionObj?.orgId} membershipReady={membershipReady} />
        </div>
        {sessionObj?.translate?.requested && (
          <div className="mt-2 text-xs rounded-md bg-blue-50 text-blue-900 px-2 py-1">
            Caller requested translation
          </div>
        )}
      </section>

      {/* Live translate */}
      <div className="rounded-lg border p-4 mt-4">
        <div className="font-medium">Live translate (bi-directional)</div>

        <label className="flex items-center gap-2 mt-2 text-sm">
          <input
            type="checkbox"
            checked={!!sessionObj?.translate?.enabled}
            onChange={(e) => saveTranslateEnabled(e.target.checked)}
          />
          Enable live translate (bi-directional)
        </label>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-medium">Agent</label>
            <select
              className="block w-full mt-1 rounded-md border p-2"
              value={agentLang}
              onChange={(e) => saveAgentLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={useBrowserLang}
              className="mt-1 text-xs text-slate-600 hover:underline"
            >
              Use my browser language
            </button>
          </div>
          <div>
            <label className="text-sm font-medium">Caller</label>
            <select
              className="block w-full mt-1 rounded-md border p-2"
              value={callerLang}
              onChange={(e) => saveCallerLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Two-box preview */}
        <div className="mt-4">
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
              title={shouldBill ? "Metered usage (PAYG)" : "Included in plan"}
            >
              {shouldBill ? "Send to chat & bill" : "Send to chat"}
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
        </div>
      </div>
    </div>
  );
}
