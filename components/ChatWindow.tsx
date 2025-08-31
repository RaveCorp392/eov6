"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Role = "AGENT" | "CALLER";

type ChatEvent =
  | { id: string; type: "TEXT"; text: string; role: Role; createdAt?: any }
  | { id: string; type: "FILE"; name: string; url: string; size?: number; role: Role; createdAt?: any }
  | { id: string; type: "DETAILS"; role: Role; createdAt?: any };

interface Props {
  sessionId: string;
  role: Role;
  className?: string;
}

export default function ChatWindow({ sessionId, role, className = "" }: Props) {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [input, setInput] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qy = query(
      collection(db, "sessions", sessionId, "events"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(qy, (snap) => {
      const rows: ChatEvent[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setEvents(rows);
      // autoscroll
      requestAnimationFrame(() => {
        boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
      });
    });
    return () => unsub();
  }, [sessionId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    await addDoc(collection(db, "sessions", sessionId, "events"), {
      type: "TEXT",
      text,                    // keep \n — we render with whitespace-pre-wrap
      role,
      createdAt: serverTimestamp(),
    });
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
    // Shift+Enter falls through to create a newline
  }

  return (
    <div className={`mx-auto w-full max-w-xl`}>
      {/* Chat area */}
      <div
        ref={boxRef}
        className={`h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3 ${className}`}
        aria-live="polite"
      >
        {events.length === 0 && (
          <p className="text-xs text-white/60">No messages yet. Say hello!</p>
        )}
        <ul className="space-y-2">
          {events.map((ev) => {
            const mine = ev.role === role;
            return (
              <li key={ev.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-5 ${
                    ev.type === "FILE"
                      ? mine
                        ? "bg-blue-600/30 text-blue-50"
                        : "bg-white/10 text-blue-100"
                      : mine
                        ? "bg-blue-600/30 text-blue-50"
                        : "bg-white/10 text-white"
                  }`}
                >
                  {ev.type === "TEXT" && <span>{(ev as any).text}</span>}
                  {ev.type === "FILE" && (
                    <a
                      href={(ev as any).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {(ev as any).name}
                    </a>
                  )}
                  {ev.type === "DETAILS" && <span className="italic opacity-80">Caller details shared</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white placeholder-white/40 focus:outline-none"
          placeholder="Type a message... (Enter = send, Shift+Enter = newline)"
        />
        <button
          onClick={sendMessage}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>

      <p className="mt-1 text-[11px] text-white/50">
        Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.
      </p>
    </div>
  );
}
