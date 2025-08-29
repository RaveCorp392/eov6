"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "@/lib/firebase";

type PageProps = { params: { code: string } };

type Event =
  | { id: string; type: "CHAT"; role: "CALLER" | "AGENT"; text: string; ts?: any }
  | {
      id: string;
      type: "DETAILS";
      name: string;
      email: string;
      phone: string;
      ts?: any;
    }
  | {
      id: string;
      type: "FILE";
      role: "CALLER" | "AGENT";
      name: string;
      size: number;
      url: string;
      contentType?: string;
      ts?: any;
    }
  | { id: string; [k: string]: any };

export default function AgentConsolePage({ params }: PageProps) {
  const sessionCode = params.code;
  const [events, setEvents] = useState<Event[]>([]);
  const [details, setDetails] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // subscribe to event stream
  useEffect(() => {
    const q = query(collection(db, "sessions", sessionCode, "events"), orderBy("ts", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
      setEvents(rows);

      // latest details
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].type === "DETAILS") {
          const d = rows[i] as any;
          setDetails({ name: d.name, email: d.email, phone: d.phone });
          break;
        }
      }
    });
    return () => unsub();
  }, [sessionCode]);

  // auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  async function sendChat() {
    const text = msg.trim();
    if (!text) return;
    setMsg("");
    // write chat event
    await addDoc(collection(db, "sessions", sessionCode, "events"), {
      type: "CHAT",
      role: "AGENT",
      text,
      ts: serverTimestamp(),
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendChat();
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Agent console</h1>
          <p className="mt-1 text-sm/6 opacity-75">
            Session <span className="font-mono font-semibold">{sessionCode}</span>
          </p>
        </header>

        {/* Caller details */}
        <section
          aria-labelledby="caller-details"
          className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <h2 id="caller-details" className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Caller details
          </h2>
          <div className="whitespace-pre-wrap font-mono text-sm">
            Name — {details.name ?? "—"}
            {"\n"}email — {details.email ?? "—"}
            {"\n"}Phone — {details.phone ?? "—"}
            {"\n"}identified — {details.name || details.email || details.phone ? "Yes" : "No"}
          </div>
        </section>

        {/* Chat feed */}
        <section
          aria-labelledby="chat-feed"
          className="mb-3 flex min-h-[300px] flex-col rounded-xl border border-white/10 bg-white/5"
        >
          <h2 id="chat-feed" className="sr-only">
            Chat feed
          </h2>
          <div
            ref={scrollRef}
            className="max-h-[50vh] min-h-[260px] overflow-y-auto p-4"
            role="log"
            aria-live="polite"
          >
            <div className="space-y-2 font-mono text-sm">
              {events.map((ev) => {
                if (ev.type === "CHAT") {
                  const c = ev as any;
                  const isAgent = c.role === "AGENT";
                  return (
                    <div
                      key={ev.id}
                      className={isAgent ? "text-blue-300" : "text-emerald-300"}
                    >
                      <span className="font-semibold">{c.role}</span>
                      <span className="text-white/60">: </span>
                      <span className="text-white">{c.text}</span>
                    </div>
                  );
                }
                if (ev.type === "DETAILS") {
                  return (
                    <div key={ev.id} className="text-white/70">
                      SYSTEM: Caller details were shared with the agent.
                    </div>
                  );
                }
                if (ev.type === "FILE") {
                  const f = ev as any;
                  const kb = Math.round((f.size ?? 0) / 102.4) / 10;
                  return (
                    <div key={ev.id} className="text-white">
                      <span className={f.role === "AGENT" ? "text-blue-300" : "text-emerald-300"}>
                        {f.role}
                      </span>{" "}
                      file:{" "}
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 underline underline-offset-2 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 rounded"
                      >
                        {f.name} ({kb} KB)
                      </a>
                    </div>
                  );
                }
                return (
                  <div key={ev.id} className="text-white/70">
                    SYSTEM event
                  </div>
                );
              })}
            </div>
          </div>

          {/* Send bar */}
          <div className="border-t border-white/10 p-3">
            <label htmlFor="agent-message" className="sr-only">
              Type a message
            </label>
            <div className="flex items-center gap-2">
              <input
                id="agent-message"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a message…"
                className="h-10 flex-1 rounded-lg bg-[#0a1429] px-3 text-[15px] text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/60"
                autoComplete="off"
                aria-label="Message input"
              />
              <button
                onClick={() => void sendChat()}
                className="h-10 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-black hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                Send
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/50">Press Enter to send</p>
          </div>
        </section>
      </div>
    </main>
  );
}
