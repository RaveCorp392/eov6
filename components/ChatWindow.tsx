// components/ChatWindow.tsx
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage, watchMessages, watchSession, type ChatMessage, type Role, uploadFileToSession } from "@/lib/firebase";

type Props = {
  code: string;
  role: Role;
  disabled?: boolean;
  showUpload?: boolean; // caller page true, agent page false
};

export default function ChatWindow({ code, role, disabled, showUpload = false }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => watchMessages(code, setMsgs), [code]);
  useEffect(() => watchSession(code, setSession), [code]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs.length]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    // live translate if enabled
    const tx = session?.translate;
    const live = tx?.enabled === true;
    const agentLang = tx?.agentLang || 'en';
    const callerLang = tx?.callerLang || 'en';
    if (live) {
      const target = role === 'agent' ? callerLang : agentLang;
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code,
            text,
            target,
            commit: true,
            sender: role,
            agentLang: session?.translate?.agentLang,
            callerLang: session?.translate?.callerLang,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'translate failed');
        setInput("");
        return;
      } catch (e) {
        alert('Translate/send failed. Sent original instead.');
      }
    }
    await sendMessage(code, role, text);
    setInput("");
  }, [code, input, role, session]);
  function bubbleFor(msg: any) {
    const mine = msg.role === role;
    const src = msg?.orig?.text as string | undefined;
    const srcLang = msg?.orig?.lang as string | undefined;
    const tgtLang = msg?.lang?.tgt as string | undefined;

    const primary = mine ? (src ?? msg.text ?? "") : (msg.text ?? src ?? "");
    const secondary = mine
      ? (msg.meta?.translated && msg.text ? "Translated (" + ((tgtLang || "").toUpperCase()) + "): " + msg.text : "")
      : (src ? "Original (" + ((srcLang || "").toUpperCase()) + "): " + src : "");

    return (
      <div key={msg.id} className={"flex " + (mine ? "justify-end" : "justify-start") + " my-1"}>
        <div className={(mine ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900") + " rounded-2xl px-3 py-1.5 max-w-[70%]"}>
          <div className="whitespace-pre-wrap break-words">{primary}</div>
          {secondary && <div className={("text-xs mt-1 ") + (mine ? "text-blue-100/80" : "text-slate-500")}>{secondary}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[55vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white/80 dark:bg-slate-900/60">
        {msgs.map(m => bubbleFor(m))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              await send();
            }
          }}
          placeholder={disabled ? "Please accept the privacy notice to chatâ€¦" : "Type a message"}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
        />
        <button onClick={send} disabled={disabled} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50">Send</button>

        {showUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const okType = file.type.startsWith('image/') || file.type === 'application/pdf' || /\.(png|jpe?g|gif|webp|bmp|svg|pdf)$/i.test(file.name);
              if (!okType) {
                alert('Please select an image or PDF file.');
                e.currentTarget.value = '';
                return;
              }
              try {
                const url = await uploadFileToSession(code, file);
                await sendMessage(code, { sender: role, type: "file", url, text: file.name });
              } catch (e) {
                alert("Upload failed. If you're running locally, please retry or disable any ad-blockers. (It should work fine on Vercel.)");
              }
            }}
            />
            <button
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Upload
            </button>
          </>
        )}
      </div>
    </div>
  );
}

