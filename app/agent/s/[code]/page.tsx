"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { Msg, formatKB } from "@/lib/code";

type Params = { params: { code: string } };

export default function AgentSessionPage({ params }: Params) {
  const code = params.code;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);
  const [input, setInput] = useState("");

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(() => collection(db, "sessions", code, "messages"), [code]);

  useEffect(() => {
    const unsubHeader = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (d) setClosed(Boolean(d.closed));
    });
    const unsubMsgs = onSnapshot(query(msgsRef, orderBy("at", "asc")), (snap) => {
      const rows: Msg[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as any;
        if (data?.file?.url) {
          rows.push({
            from: data.from,
            at: data.at,
            file: {
              url: data.file.url,
              name: data.file.name,
              size: data.file.size,
              type: data.file.type,
              path: data.file.path,
            },
          });
        } else if (data?.text) {
          rows.push({ text: data.text, from: data.from, at: data.at });
        }
      });
      setMessages(rows);
    });

    return () => { unsubHeader(); unsubMsgs(); };
  }, [sessRef, msgsRef]);

  async function sendPrompt(prompt: string) {
    await addDoc(msgsRef, { text: prompt, from: "agent", at: serverTimestamp() });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || closed) return;
    await addDoc(msgsRef, { text, from: "agent", at: serverTimestamp() });
    setInput("");
  }

  async function endSession() {
    await setDoc(sessRef, { closed: true }, { merge: true });
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="mb-2 text-sm text-slate-600">
        Session <b>{code}</b> {closed && <span className="text-red-600 font-semibold ml-2">(Session closed)</span>}
      </div>

      <div className="border rounded-lg p-4 h-[420px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 max-w-[80%] ${m.from === "caller" ? "" : "ml-auto text-right"}`}>
            {m.file ? (
              <div className={`inline-block rounded-lg px-3 py-2 ${m.from === "caller" ? "bg-gray-100" : "bg-indigo-100"}`}>
                <a href={m.file.url} className="underline" target="_blank" rel="noreferrer">
                  {m.file.name} ({formatKB(m.file.size)})
                </a>
              </div>
            ) : (
              <div className={`inline-block rounded-lg px-3 py-2 ${m.from === "caller" ? "bg-gray-100" : "bg-indigo-100"}`}>
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={closed}
        />
        <button onClick={sendMessage} disabled={closed} className="rounded bg-green-600 text-white px-4 py-2 disabled:opacity-50">
          Send
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => sendPrompt("Could you please provide your full name?")} className="rounded border px-3 py-1">Ask name</button>
        <button onClick={() => sendPrompt("Could you please provide your best email address?")} className="rounded border px-3 py-1">Ask email</button>
        <button onClick={() => sendPrompt("Could you please provide a phone number we can reach you on?")} className="rounded border px-3 py-1">Ask phone</button>

        <div className="flex-1" />

        <button onClick={endSession} disabled={closed} className="rounded bg-red-600 text-white px-4 py-2 disabled:opacity-50">
          End session
        </button>
      </div>
    </main>
  );
}
