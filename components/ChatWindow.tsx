"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// NOTE: import the TYPE from your firebase adapter so it matches exactly
import { getMessages, sendMessage } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/firebase";

/** Who is typing on this screen */
export type Role = "AGENT" | "CALLER";

type ChatWindowProps = {
  /** Many places call this sessionId or sessionCode — we accept either */
  sessionId?: string;
  sessionCode?: string;
  /** Who is typing on this device */
  role: Role;
};

/** Utility: normalize newlines, and trim stray spaces */
function normalizeOutgoing(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

export default function ChatWindow(props: ChatWindowProps) {
  const session = useMemo(
    () => props.sessionId || props.sessionCode || "",
    [props.sessionId, props.sessionCode]
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [sending, setSending] = useState(false);

  // Subscribe to messages for this session
  useEffect(() => {
    if (!session) return;
    // Your firebase adapter should return an unsubscribe function.
    const unsub = getMessages(session, (msgs: ChatMessage[]) => {
      // Ensure we always provide an id so React list keys are stable
      const safe: ChatMessage[] = (msgs || []).map((m, i) => ({
        ...m,
        id: m.id ?? `${i}-${m.ts ?? ""}`,
      }));
      setMessages(safe);
    });
    return () => {
      try {
        typeof unsub === "function" && unsub();
      } catch {
        /* no-op */
      }
    };
  }, [session]);

  // Autoscroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const doSend = useCallback(async () => {
    const text = normalizeOutgoing(input);
    if (!text || !session || sending) return;

    setSending(true);
    try {
      await sendMessage(session, {
        text,
        sender: props.role,
        ts: Date.now(),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  }, [input, session, props.role, sending]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  };

  return (
    <div className="w-full flex justify-center">
      {/* Outer column constrained ~1/3 of desktop width */}
      <div className="mx-auto w-full max-w-xl">
        {/* Chat viewport (scroll-contained) */}
        <div
          className="h-[70vh] overflow-y-auto rounded-2xl border border-[var(--line,#1e293b)] bg-[var(--panel,#0f172a)] p-4"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--muted,#94a3b8)]">
              No messages yet. Say hello!
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((m, idx) => {
                const isAgent = m.sender === "AGENT";
                return (
                  <li
                    key={m.id ?? `${idx}-${m.ts ?? ""}`}
                    className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
                  >
                    <div className="max-w-[75%]">
                      <div
                        className={`text-xs mb-1 ${
                          isAgent
                            ? "text-sky-300 opacity-80"
                            : "text-emerald-300 opacity-80 text-right"
                        }`}
                      >
                        {isAgent ? "Agent" : "You"}
                      </div>
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2 leading-relaxed ${
                          isAgent ? "bg-sky-600 text-white" : "bg-slate-700 text-white"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </li>
                );
              })}
              <div ref={endRef} />
            </ul>
          )}
        </div>

        {/* Composer */}
        <div className="mt-3 flex items-start gap-2">
          <textarea
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-[var(--line,#1e293b)] bg-[#0b1327] p-3 text-[var(--fg,#e6f2ff)] outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Type a message… (Enter = send, Shift+Enter = newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
          />
          <button
            className="h-[44px] shrink-0 rounded-xl border border-[var(--line,#1e293b)] bg-sky-600 px-4 text-white hover:brightness-110 disabled:opacity-60"
            onClick={() => void doSend()}
            disabled={!input.trim() || sending}
            type="button"
          >
            Send
          </button>
        </div>

        <p className="mt-2 text-xs text-[var(--muted,#94a3b8)]">
          Press <span className="kbd">Enter</span> to send,&nbsp;
          <span className="kbd">Shift+Enter</span> for a new line.
        </p>
      </div>
    </div>
  );
}
