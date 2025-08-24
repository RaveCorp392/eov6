"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, Msg } from "@/lib/code";
import NewSessionButton from "@/components/NewSessionButton";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [closed, setClosed] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");

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
          const base: Msg = { from: data.from, at: data.at };
          if (data?.file?.url) {
            base.file = {
              url: data.file.url,
              name: data.file.name,
              size: data.file.size,
              type: data.file.type,
            };
          } else if (data?.text) {
            base.text = data.text;
          }
          rows.push(base);
        });
        setMessages(rows);
      }
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function sendAgent(text: string) {
    if (!text.trim() || closed) return;
    await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
  }

  async function handleSend() {
    await sendAgent(input);
    setInput("");
  }

  async function endSession() {
    await setDoc(
      sessRef,
      { closed: true, expiresAt: expiryInHours(1) },
      { merge: true }
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="mr-3">Session <b>{code}</b></span>
          {name && <span className="mr-3">{name}</span>}
          {email && <span className="mr-3">{email}</span>}
          {phone && <span>{phone}</span>}
          {closed && (
            <span className="ml-2 text-red-600 font-semibold">
              (Session closed)
            </span>
          )}
        </div>
        {closed && (
          <NewSessionButton label="Start next session" emphasize />
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
              {m.file ? (
                <a
                  href={m.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {m.file.name} ({Math.ceil(m.file.size / 1024)} KB)
                </a>
              ) : (
                m.text
              )}
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
          onClick={handleSend}
          disabled={closed}
          className="rounded bg-green-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => sendAgent("Could you please provide your full name?")}
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask name
        </button>
        <button
          onClick={() => sendAgent("Could you please provide your best email address?")}
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask email
        </button>
        <button
          onClick={() => sendAgent("Could you please provide a phone number we can reach you on?")}
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask phone
        </button>

        <button
          onClick={endSession}
          className="ml-auto rounded bg-red-600 text-white px-4 py-2"
        >
          End session
        </button>
      </div>
    </main>
  );
}
