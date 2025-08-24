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
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  // live session header + messages
  useEffect(() => {
    const unsubHeader = onSnapshot(
      sessRef,
      (snap) => {
        const d = snap.data() as any;
        setClosed(Boolean(d?.closed));
      },
      (err) => console.error("[agent] header snapshot error:", err)
    );

    const unsubMsgs = onSnapshot(
      query(msgsRef, orderBy("at", "asc")),
      (snap) => {
        const rows: Msg[] = [];
        snap.forEach((d) => {
          const v = d.data() as any;
          if (v?.text && v?.from && v?.at) rows.push(v as Msg);
        });
        setMsgs(rows);
      },
      (err) => console.error("[agent] messages snapshot error:", err)
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function send() {
    const text = input.trim();
    if (!text || closed) return;
    try {
      await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
      setInput("");
    } catch (e) {
      console.error("[agent] send failed:", e);
    }
  }

  async function ask(kind: "name" | "email" | "phone") {
    if (closed) return;
    const copy =
      kind === "name"
        ? "Could you please provide your full name?"
        : kind === "email"
        ? "Could you please provide your best email address?"
        : "Could you please provide a phone number we can reach you on?";
    await addDoc(msgsRef, { text: copy, from: "agent", at: serverTimestamp() });
  }

  async function endSession() {
    try {
      await setDoc(
        sessRef,
        { closed: true, closedAt: serverTimestamp() },
        { merge: true }
      );
      await addDoc(msgsRef, {
        text: "Session was closed by agent.",
        from: "agent",
        at: serverTimestamp(),
      });
    } catch (e) {
      console.error("[agent] endSession failed:", e);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-3">
      <div className="text-sm text-gray-600">
        Session <b>{code}</b>{" "}
        {closed && (
          <span className="ml-2 text-red-600 font-semibold">(Session closed)</span>
        )}
      </div>

      {closed && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="text-indigo-900 font-medium">
            Session ended. Start the next one?
          </div>
          {/* Uses existing component; no prop changes needed */}
          <NewSessionButton label="Start next session" />
        </div>
      )}

      <div className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "agent" ? "ml-auto text-right" : ""
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
