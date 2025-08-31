"use client";

import React, { useEffect, useRef, useState } from "react";
import { db, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "@/lib/firebase";

type Props = {
  sessionCode: string;
  role: "CALLER" | "AGENT";
};

type ChatEvent = {
  id: string;
  type: "CHAT";
  role: "CALLER" | "AGENT";
  text: string;
  ts?: any;
};

export default function ChatWindow({ sessionCode, role }: Props) {
  const [value, setValue] = useState("");
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "sessions", sessionCode, "events"),
      orderBy("ts", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((e) => e.type === "CHAT") as ChatEvent[];
      setEvents(rows);
      // slight delay so DOM paints then scroll
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 0);
    });
    return () => unsub();
  }, [sessionCode]);

  async function send() {
    const text = value.trim();
    if (!text) return;
    setValue("");
    await addDoc(collection(db, "sessions", sessionCode, "events"), {
      type: "CHAT",
      role,
      text,
      ts: serverTimestamp(),
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    // Shift+Enter -> newline (default), so no handling needed
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto rounded-lg bg-[#0E1626] p-3 ring-1 ring-white/10">
        {events.map((m) => (
          <div key={m.id} className="mb-2 text-[13px] leading-5 font-mono">
            <span className="opacity-70">{m.role}:</span> {m.text}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          className="flex-1 rounded-lg bg-[#0E1626] text-white placeholder-white/40 p-3 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={send}
          disabled={!value.trim()}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>

      <p className="mt-1 text-[11px] text-white/50">
        Press <kbd className="rounded bg-white/10 px-1">Enter</kbd> to send,{" "}
        <kbd className="rounded bg-white/10 px-1">Shift</kbd>+<kbd className="rounded bg-white/10 px-1">Enter</kbd> for a new line.
      </p>
    </div>
  );
}
