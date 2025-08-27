"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

type Role = "agent" | "caller";

type Msg =
  | {
      id: string;
      ts?: { seconds: number; nanoseconds: number } | null;
      role: Role;
      type: "text";
      text: string;
    }
  | {
      id: string;
      ts?: { seconds: number; nanoseconds: number } | null;
      role: Role;
      type: "file";
      name: string;
      size: number;
      mime: string;
      url: string;
    }
  | {
      id: string;
      ts?: { seconds: number; nanoseconds: number } | null;
      role: Role;
      type: "system";
      text: string;
    };

type Props = {
  code: string;
  role: Role;
  className?: string;
};

export default function ChatWindow({ code, role, className = "" }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "sessions", code, "messages"),
      orderBy("ts", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const next: Msg[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (!data?.type) return;
        next.push({ id: d.id, ...data });
      });
      setMsgs(next);
      // gentle scroll after render
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    });
    return () => unsub();
  }, [code]);

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await addDoc(collection(db, "sessions", code, "messages"), {
      ts: serverTimestamp(),
      role,
      type: "text",
      text: value
    });
  }

  const label = useMemo(() => (role === "agent" ? "AGENT" : "CALLER"), [role]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto rounded border border-slate-700 bg-slate-950/60 p-3">
        {msgs.map((m) => {
          const who = m.role === "agent" ? "AGENT" : "CALLER";
          const ts =
            (m as any).ts?.seconds
              ? new Date((m as any).ts.seconds * 1000)
              : null;

        if (m.type === "text") {
            return (
              <div key={m.id} className="mb-2 text-slate-200">
                <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {who}
                </span>
                <span>{m.text}</span>
                {ts && (
                  <span className="ml-2 text-xs text-slate-500">
                    {ts.toLocaleTimeString()}
                  </span>
                )}
              </div>
            );
          }

          if (m.type === "file") {
            // LINK-ONLY (no auto image preview)
            const sizeKb = (m.size / 1024).toFixed(1);
            return (
              <div key={m.id} className="mb-2">
                <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {who}
                </span>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sky-300 hover:text-sky-200"
                >
                  {m.name}
                </a>
                <span className="ml-2 text-xs text-slate-500">
                  {sizeKb} KB
                </span>
              </div>
            );
          }

          // system fallback
          return (
            <div key={m.id} className="mb-2 text-xs text-slate-400 italic">
              {m.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input row */}
      <form onSubmit={sendText} className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
        />
        <button
          type="submit"
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}
