"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useRouter } from "next/navigation";
// import NewSessionButton only for debug
import NewSessionButton from "@/components/NewSessionButton";

type Params = { params: { code: string } };

export default function CallerPage({ params }: Params) {
  const code = params.code;
  const router = useRouter();

  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);

  const showDebug = process.env.NEXT_PUBLIC_DEBUG_LINKS === "1";

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  // --- auto-scroll target ---
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ensure session exists + subscribe to header + messages
  useEffect(() => {
    setDoc(
      sessRef,
      { createdAt: serverTimestamp(), expiresAt: expiryInHours(1) },
      { merge: true }
    );

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
          const v = doc.data() as any;
          if (v?.text && v?.from && v?.at) rows.push({ text: v.text, from: v.from, at: v.at });
        });
        setMessages(rows);
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
    await addDoc(msgsRef, { text, from: "caller", at: serverTimestamp() });
    setInput("");
  }

  async function sendDetails() {
    if (closed) return;
    await setDoc(
      sessRef,
      {
        name: name?.trim() || "",
        email: email?.trim() || "",
        phone: phone?.trim() || "",
        identified: Boolean(name || email || phone),
        expiresAt: expiryInHours(1),
      },
      { merge: true }
    );

    await addDoc(msgsRef, {
      text: "Contact details were provided.",
      from: "caller",
      at: serverTimestamp(),
    });
  }

  function leaveSession() {
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-3">
      <div className="text-sm text-gray-600">
        Ephemeral session <b>{code}</b>. Data is cleared automatically by policy.
        {closed && <span className="ml-2 text-red-600 font-semibold">(Session ended by agent)</span>}
      </div>

      {/* DEBUG ONLY: hide in production unless NEXT_PUBLIC_DEBUG_LINKS=1 */}
      {showDebug && (
        <div className="flex items-center gap-2">
          <NewSessionButton label="Open agent console" />
        </div>
      )}

      <div
        ref={listRef}
        className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${m.from === "caller" ? "ml-auto text-right" : ""}`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 ${
                m.from === "caller" ? "bg-indigo-100" : "bg-gray-100"
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
          onClick={sendMessage}
          disabled={closed}
          className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={closed}
        />
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={closed}
        />
        <input
          className="w-44 rounded border px-3 py-2"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={closed}
        />
        <button
          onClick={sendDetails}
          disabled={closed}
          className="rounded bg-violet-600 text-white px-3 py-2 shrink-0 disabled:opacity-50"
        >
          Send details
        </button>
      </div>

      <button onClick={leaveSession} className="w-full rounded bg-gray-100 px-3 py-2">
        Leave session
      </button>
    </div>
  );
}
