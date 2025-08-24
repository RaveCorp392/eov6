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
import NewSessionButton from "@/components/NewSessionButton";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);

  // simple caller header fields (if they share them)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  // subscribe to header + messages
  useEffect(() => {
    const unsubHeader = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (d) {
        setClosed(Boolean(d.closed));
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
      }
    });

    const unsubMsgs = onSnapshot(
      query(msgsRef, orderBy("at", "asc")),
      (snap) => {
        const rows: Msg[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          // accept either text or file* messages
          if ((data?.text || data?.fileUrl) && data?.from && data?.at) {
            rows.push({
              text: data.text,
              from: data.from,
              at: data.at,
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileType: data.fileType,
              fileSize: data.fileSize,
            });
          }
        });
        setMessages(rows);

        // autoscroll
        setTimeout(() => {
          const box = document.getElementById("agent-chat-box");
          if (box) box.scrollTop = box.scrollHeight;
        }, 0);
      }
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || closed) return;
    await addDoc(msgsRef, {
      text,
      from: "agent",
      at: serverTimestamp(),
    });
    setInput("");
  }

  async function ask(text: string) {
    if (closed) return;
    await addDoc(msgsRef, {
      text,
      from: "agent",
      at: serverTimestamp(),
    });
  }

  async function endSession() {
    await setDoc(
      sessRef,
      { closed: true, closedAt: serverTimestamp() },
      { merge: true }
    );
  }

  const headerPill = (label: string) => (
    <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs">
      {label}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <div>
          Session <b>{code}</b>
          {closed && (
            <span className="ml-2 text-red-600 font-semibold">
              (Session closed)
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {name && headerPill(name)}
          {email && headerPill(email)}
          {phone && headerPill(phone)}
        </div>
      </div>

      {/* Closed banner with next-session button */}
      {closed && (
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
          <div className="text-sm text-indigo-900">
            Session ended. Start the next one?
          </div>
          <NewSessionButton />
        </div>
      )}

      {/* Chat window */}
      <div
        id="agent-chat-box"
        className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white"
      >
        {messages.map((m, i) => {
          const mine = m.from === "agent";
          const wrapper = `mb-2 max-w-[80%] ${mine ? "ml-auto text-right" : ""}`;
          const bubble = `inline-block rounded-lg px-3 py-2 ${
            mine ? "bg-green-100" : "bg-gray-100"
          }`;
          const isImg = m.fileUrl && m.fileType?.startsWith("image/");
          return (
            <div key={i} className={wrapper}>
              <div className={bubble}>
                {m.fileUrl ? (
                  <div className="space-y-2 text-left">
                    {isImg && (
                      <img
                        src={m.fileUrl}
                        alt={m.fileName || "uploaded image"}
                        className="max-h-56 rounded"
                      />
                    )}
                    <div className="text-sm">
                      📎 {m.fileName || "File"}{" "}
                      {typeof m.fileSize === "number" && (
                        <span className="text-slate-600">
                          ({Math.ceil(m.fileSize / 1024)} KB)
                        </span>
                      )}
                      {" • "}
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ) : (
                  m.text
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input row + canned prompts */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={closed}
        />
        <button
          onClick={sendMessage}
          disabled={closed}
          className="rounded bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => ask("Could you please provide your full name?")}
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask name
        </button>
        <button
          onClick={() => ask("Could you please provide your best email address?")}
          disabled={closed}
          className="rounded border px-3 py-2"
        >
          Ask email
        </button>
        <button
          onClick={() => ask("Could you please provide a phone number we can reach you on?")}
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
