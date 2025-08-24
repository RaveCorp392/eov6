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
  updateDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, Msg } from "@/lib/code";
import NewSessionButton from "@/components/NewSessionButton";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  // caller profile shown as chips
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // once true, we don’t flip it back to false unless we load a new session
  const [closed, setClosed] = useState(false);

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  // subscribe to session header + chat stream
  useEffect(() => {
    // ensure the session doc exists (merge so we never clear fields like `closed`)
    setDoc(
      sessRef,
      {
        createdAt: serverTimestamp(),
        expiresAt: expiryInHours(1),
      },
      { merge: true }
    );

    const unsubHeader = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (!d) return;

      // chips
      setName(d.name ?? "");
      setEmail(d.email ?? "");
      setPhone(d.phone ?? "");

      // IMPORTANT: only ever set closed -> true; never force to false on re-sync
      if (d.closed === true) setClosed(true);
    });

    const unsubMsgs = onSnapshot(
      query(msgsRef, orderBy("at", "asc")),
      (snap) => {
        const rows: Msg[] = [];
        snap.forEach((m) => {
          const v = m.data() as any;
          if (v?.text && v?.from && v?.at) {
            rows.push({ text: v.text, from: v.from, at: v.at });
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

  // canned prompts
  async function ask(kind: "name" | "email" | "phone") {
    const text =
      kind === "name"
        ? "Could you please provide your full name?"
        : kind === "email"
        ? "Could you please provide your best email address?"
        : "Could you please provide a phone number we can reach you on?";

    await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
  }

  async function send() {
    const text = input.trim();
    if (!text || closed) return;
    await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
    setInput("");
  }

  async function endSession() {
    // mark closed; we don’t navigate automatically so the banner remains
    await updateDoc(sessRef, {
      closed: true,
      endedAt: serverTimestamp(),
      // we also refresh TTL so retention is consistent after end
      expiresAt: expiryInHours(1),
    });
    setClosed(true); // optimistic
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-3">
      {/* top bar: session + chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <span className="text-gray-600">Session </span>
          <b>{code}</b>
          {closed && (
            <span className="ml-2 text-red-600 font-semibold">
              (Session closed)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded bg-gray-100 px-3 py-1">
            {name || "—"}
          </span>
          <span className="inline-flex items-center rounded bg-gray-100 px-3 py-1">
            {email || "—"}
          </span>
          <span className="inline-flex items-center rounded bg-gray-100 px-3 py-1">
            {phone || "—"}
          </span>
        </div>
      </div>

      {/* when closed, keep a persistent CTA to start the next session */}
      {closed && (
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
          <div className="text-indigo-900">
            <b>Session ended.</b> Start the next one?
          </div>
          <NewSessionButton label="Start next session" emphasize />
        </div>
      )}

      {/* chat window */}
      <div className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "agent" ? "mr-auto" : "ml-auto text-right"
            }`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 ${
                m.from === "agent" ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* compose row */}
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
          className="rounded bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* canned prompts */}
      <div className="flex gap-2">
        <button
          onClick={() => ask("name")}
          disabled={closed}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Ask name
        </button>
        <button
          onClick={() => ask("email")}
          disabled={closed}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Ask email
        </button>
        <button
          onClick={() => ask("phone")}
          disabled={closed}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Ask phone
        </button>
      </div>

      {/* end session */}
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
