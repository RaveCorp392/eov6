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
import { Msg } from "@/lib/code";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
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
          rows.push({
            text: data.text,
            from: data.from,
            at: data.at,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
          });
        });
        setMessages(rows);
      }
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
    setInput("");
  }

  async function endSession() {
    await setDoc(sessRef, { closed: true }, { merge: true });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <div>
          <span className="text-slate-500 mr-2">Session</span>
          <b>{code}</b>
          {closed && (
            <span className="ml-2 text-red-600 font-semibold">
              (Session closed)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {name && <span className="rounded bg-slate-100 px-2 py-1">{name}</span>}
          {email && (
            <span className="rounded bg-slate-100 px-2 py-1">{email}</span>
          )}
          {phone && (
            <span className="rounded bg-slate-100 px-2 py-1">{phone}</span>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "caller" ? "ml-auto text-right" : ""
            }`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 ${
                m.from === "caller" ? "bg-indigo-100" : "bg-gray-100"
              }`}
            >
              {m.fileUrl ? (
                <div className="space-y-1 text-left">
                  {m.fileType?.startsWith("image/") ? (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer">
                      <img
                        src={m.fileUrl}
                        alt={m.fileName ?? "image"}
                        className="max-h-40 rounded border"
                      />
                    </a>
                  ) : (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {m.fileName ?? "Download file"}
                    </a>
                  )}
                  <div className="text-xs text-slate-600">
                    {m.fileName}{" "}
                    {m.fileSize ? `(${Math.ceil(m.fileSize / 1024)} KB)` : ""}
                  </div>
                </div>
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
          onClick={send}
          disabled={closed}
          className="rounded bg-green-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* Canned prompts */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            addDoc(msgsRef, {
              text: "Could you please provide your full name?",
              from: "agent",
              at: serverTimestamp(),
            })
          }
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask name
        </button>
        <button
          onClick={() =>
            addDoc(msgsRef, {
              text: "Could you please provide your best email address?",
              from: "agent",
              at: serverTimestamp(),
            })
          }
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask email
        </button>
        <button
          onClick={() =>
            addDoc(msgsRef, {
              text: "Could you please provide a phone number we can reach you on?",
              from: "agent",
              at: serverTimestamp(),
            })
          }
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask phone
        </button>
      </div>

      <button
        onClick={endSession}
        disabled={closed}
        className="w-full rounded bg-red-600 text-white px-3 py-2 disabled:opacity-50"
      >
        End session
      </button>
    </div>
  );
}
