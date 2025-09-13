// components/ChatWindow.tsx
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage, watchMessages, type ChatMessage, type Role, uploadFileToSession } from "@/lib/firebase";

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

  useEffect(() => watchMessages(code, setMsgs), [code]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs.length]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    await sendMessage(code, { text, sender: role, type: "text" });
    setInput("");
  }, [code, input, role]);

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[55vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white/80 dark:bg-slate-900/60">
        {msgs.map((m, i) => {
          const mine = m.role === role;
          const sys = m.type === "system" || m.role === "system";
          const base = "inline-block max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-5 break-words shadow-sm";
          return (
            <div key={i} className={`my-1 flex ${sys ? "justify-center" : mine ? "justify-end" : "justify-start"}`}>
              {sys ? (
                <span className="text-xs text-amber-800 bg-amber-100 rounded-full px-3 py-1">{m.text}</span>
              ) : (
                <span className={base + " " + (mine ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100") }>
                  {m.type === "file" && m.url ? (
                    <a href={m.url} target="_blank" className="underline break-all" rel="noreferrer">
                      {m.text || "file"}
                    </a>
                  ) : (
                    m.text
                  )}
                </span>
              )}
            </div>
          );
        })}
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
          placeholder={disabled ? "Please accept the privacy notice to chat…" : "Type a message"}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
        />
        <button onClick={send} disabled={disabled} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50">Send</button>

        {showUpload && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadFileToSession(code, file);
              await sendMessage(code, { sender: role, type: "file", url, text: file.name });
            }} />
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
