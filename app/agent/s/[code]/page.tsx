// app/agent/s/[code]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { Msg } from "@/lib/code";
import NewSessionButton from "@/components/NewSessionButton";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [closed, setClosed] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  useEffect(() => {
    const unsubHead = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (d) {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
        setClosed(Boolean(d.closed));
      }
    });

    const unsubMsgs = onSnapshot(query(msgsRef, orderBy("at", "asc")), (snap) => {
      const rows: Msg[] = [];
      snap.forEach((x) => {
        const d = x.data() as any;
        const m: Msg = { from: d.from, at: d.at };
        if (d.text) m.text = d.text;
        if (d.fileUrl) {
          m.fileUrl = d.fileUrl;
          m.fileName = d.fileName;
          m.fileType = d.fileType;
          m.fileSize = d.fileSize;
        }
        rows.push(m);
      });
      setMessages(rows);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    });

    return () => {
      unsubHead();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || closed) return;
    await addDoc(msgsRef, { from: "agent", text: t, at: serverTimestamp() });
  }

  async function endSession() {
    await setDoc(
      sessRef,
      { closed: true, closedAt: serverTimestamp() },
      { merge: true }
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
        <div>
          <b>Session</b> {code}
        </div>
        {closed && (
          <>
            <span className="text-red-600 font-semibold">(Session closed)</span>
            <NewSessionButton />
          </>
        )}
      </div>

      <div className="rounded-lg border p-4 h-[360px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "agent" ? "ml-auto text-right" : ""
            }`}
          >
            {m.fileUrl ? (
              <div className="inline-block rounded-lg px-3 py-2 bg-indigo-50">
                <a
                  className="underline"
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {m.fileName || "File"}
                </a>
                {typeof m.fileSize === "number" && (
                  <span className="ml-2 text-xs text-slate-600">
                    ({Math.ceil(m.fileSize / 1024)} KB)
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`inline-block rounded-lg px-3 py-2 ${
                  m.from === "agent" ? "bg-emerald-100" : "bg-gray-100"
                }`}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={closed}
        />
        <button
          onClick={() => send(input).then(() => setInput(""))}
          disabled={closed}
          className="rounded bg-green-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="mt-3 flex gap-2 text-sm">
        <span className="rounded bg-slate-100 px-2 py-1">{name || "—"}</span>
        <span className="rounded bg-slate-100 px-2 py-1">{email || "—"}</span>
        <span className="rounded bg-slate-100 px-2 py-1">{phone || "—"}</span>
      </div>

      <button
        onClick={endSession}
        disabled={closed}
        className="mt-4 w-full rounded bg-red-600 text-white px-3 py-2 disabled:opacity-50"
      >
        End session
      </button>
    </main>
  );
}
