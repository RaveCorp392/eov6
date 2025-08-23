"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { Msg } from "@/lib/code";

type Params = { params: { code: string } };

export default function AgentSession({ params }: Params) {
  const code = params.code;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [closed, setClosed] = useState(false);

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  useEffect(() => {
    const unsubHeader = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (d) {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
        setClosed(Boolean(d.closed));
      }
    });

    const unsubMsgs = onSnapshot(
      query(msgsRef, orderBy("at", "asc")),
      (snap) => {
        const rows: Msg[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          if (data?.text && data?.from && data?.at) {
            rows.push({
              text: data.text,
              from: data.from,
              at: data.at,
            });
          }
        });
        setMessages(rows);
      }
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || closed) return;
    await addDoc(msgsRef, {
      text: t,
      from: "agent",
      at: serverTimestamp(),
    });
  }

  async function endForBoth() {
    await updateDoc(sessRef, {
      closed: true,
      closedAt: serverTimestamp(),
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-3">
      <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
        <span>
          Session <b>{code}</b>
        </span>
        <span className="rounded bg-gray-100 px-2 py-1">{name || "—"}</span>
        <span className="rounded bg-gray-100 px-2 py-1">
          {email || "—"}
        </span>
        <span className="rounded bg-gray-100 px-2 py-1">{phone || "—"}</span>
        {closed && (
          <span className="text-red-600 font-semibold">
            (Session closed)
          </span>
        )}
      </div>

      <div className="border rounded-lg p-4 h-[420px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "agent" ? "ml-auto text-right" : ""
            }`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 ${
                m.from === "agent" ? "bg-emerald-100" : "bg-gray-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
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
          className="rounded bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => send("Could you please provide your full name?")}
          disabled={closed}
          className="rounded bg-gray-100 px-3 py-2"
        >
          Ask name
        </button>
        <button
          onClick={() => send("Could you please provide your best email address?")}
          disabled={closed}
          className="rounded bg-gray-100 px-3 py-2"
        >
          Ask email
        </button>
        <button
          onClick={() => send("Could you please provide a phone number we can reach you on?")}
          disabled={closed}
          className="rounded bg-gray-100 px-3 py-2"
        >
          Ask phone
        </button>
      </div>

      <button
        onClick={endForBoth}
        className="w-full rounded bg-red-600 text-white px-3 py-2"
      >
        End session
      </button>
    </div>
  );
}
