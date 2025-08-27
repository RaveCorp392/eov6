// app/agent/s/[code]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

type Msg = { id: string; role: "agent" | "caller" | "system"; text?: string; ts?: any };
type CallerMeta = { fullName?: string; email?: string; phone?: string; identified?: boolean };

export default function AgentSessionPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code || "").toString();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [meta, setMeta] = useState<CallerMeta>({});

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code) return;

    const q = query(collection(db, "sessions", code, "messages"), orderBy("ts", "asc"));
    const unsubMsgs = onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(next);
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
    });

    const metaRef = doc(db, "sessions", code, "meta", "caller");
    const unsubMeta = onSnapshot(metaRef, (snap) => setMeta((snap.data() as any) || {}));

    return () => {
      unsubMsgs();
      unsubMeta();
    };
  }, [code]);

  async function sendAgentMessage() {
    if (!text.trim()) return;
    await addDoc(collection(db, "sessions", code, "messages"), {
      role: "agent",
      text,
      ts: serverTimestamp(),
    });
    setText("");
  }

  return (
    <main className="min-h-screen p-4 text-sm text-white bg-[#0b1220]">
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-lg font-semibold">Agent console</h1>
        <div className="opacity-70 text-xs">Session {code}</div>
      </div>

      {/* Caller details panel */}
      <section className="rounded border border-white/10 p-3 mb-3">
        <h3 className="font-semibold mb-1">Caller details</h3>
        <div className="text-xs opacity-80">
          <div>Name — {meta.fullName || "— — —"}</div>
          <div>Email — {meta.email || "— — —"}</div>
          <div>Phone — {meta.phone || "— — —"}</div>
          <div>identified — {meta?.identified ? "Yes" : "No"}</div>
        </div>
      </section>

      {/* Messages */}
      <div
        ref={listRef}
        className="h-[44vh] overflow-y-auto rounded border border-white/10 p-3 mb-3"
      >
        {messages.map((m) => (
          <div key={m.id} className="mb-1">
            <span className="text-[10px] mr-1 opacity-60">
              {m.role.toUpperCase()}
            </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      {/* Send */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 outline-none"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendAgentMessage()}
        />
        <button
          onClick={sendAgentMessage}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
        >
          Send
        </button>
      </div>
    </main>
  );
}
