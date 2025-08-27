// app/s/[code]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

type Msg = { id: string; role: "agent" | "caller" | "system"; text?: string; ts?: any };

export default function CallerSessionPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code || "").toString();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages for autoscroll / feedback
  useEffect(() => {
    if (!code) return;
    const q = query(collection(db, "sessions", code, "messages"), orderBy("ts", "asc"));
    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(next);
      // autoscroll
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
    });
  }, [code]);

  async function sendChat() {
    if (!text.trim()) return;
    await addDoc(collection(db, "sessions", code, "messages"), {
      role: "caller",
      text,
      ts: serverTimestamp(),
    });
    setText("");
  }

  async function sendDetails() {
    try {
      const metaRef = doc(db, "sessions", code, "meta", "caller");
      await setDoc(
        metaRef,
        {
          fullName: fullName || "",
          email: email || "",
          phone: phone || "",
          identified: Boolean(fullName || email || phone),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(db, "sessions", code, "messages"), {
        role: "system",
        text: "Caller details were shared with the agent.",
        ts: serverTimestamp(),
      });

      alert("Details sent!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to send details. Please try again.");
    }
  }

  return (
    <main className="min-h-screen p-4 text-sm text-white bg-[#0b1220]">
      <h1 className="text-lg font-semibold mb-3">Secure shared chat</h1>

      {/* Chat list */}
      <div
        ref={listRef}
        className="h-[44vh] overflow-y-auto rounded border border-white/10 p-3 mb-3"
      >
        {messages.map((m) => (
          <div key={m.id} className="mb-1">
            <span className="text-[10px] mr-1 opacity-60">
              {m.role.toUpperCase()}
            </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      {/* Send a chat message (kept minimal) */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 outline-none"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat()}
        />
        <button
          onClick={sendChat}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
        >
          Send
        </button>
      </div>

      {/* Send your details */}
      <section className="mb-4">
        <h3 className="font-semibold mb-2">Send your details</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[220px] rounded bg-white/5 border border-white/10 px-3 py-2"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="min-w-[260px] rounded bg-white/5 border border-white/10 px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="min-w-[160px] rounded bg-white/5 border border-white/10 px-3 py-2"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={sendDetails}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
          >
            Send details
          </button>
        </div>
      </section>

      {/* File upload stays (your working component) */}
      {/* <UploadButton role="caller" code={code} /> */}
    </main>
  );
}
