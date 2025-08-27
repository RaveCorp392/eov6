// app/s/[code]/page.tsx
"use client";

import { useState, type FC, FormEvent } from "react";
import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";
import { db, serverTimestamp } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";

type PageProps = {
  params: { code: string };
};

const CallerSessionPage: FC<PageProps> = ({ params }) => {
  const { code } = params;

  // simple form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function onSendDetails(e: FormEvent) {
    e.preventDefault();
    try {
      // 1) persist caller profile (so the agent panel can read it)
      await setDoc(doc(db, "sessions", code, "meta", "caller"), {
        name: fullName || "",
        email: email || "",
        phone: phone || "",
        identified: !!(fullName || email || phone),
        ts: serverTimestamp(),
      });

      // 2) also drop a system line into the chat so both sides see it in-thread
      await addDoc(collection(db, "sessions", code, "messages"), {
        role: "system",
        kind: "caller-details",
        text: `Caller shared contact details.`,
        payload: { name: fullName, email, phone },
        ts: serverTimestamp(),
      });

      alert("Details sent!");
      // optional: clear the inputs
      // setFullName(""); setEmail(""); setPhone("");
    } catch (err) {
      console.error(err);
      alert("Failed to send details. Please try again.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/90">
          Secure shared chat
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Visible to agent & caller • Ephemeral: cleared when the session ends.
        </p>

        {/* Chat (caller view) */}
        <ChatWindow code={code} role="caller" />
      </section>

      {/* Caller actions: send details + upload */}
      <aside className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-3 text-sm font-semibold text-white/90">
            Send your details
          </h3>

          <form onSubmit={onSendDetails} className="flex flex-wrap items-center gap-2">
            <input
              className="h-8 w-48 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className="h-8 w-64 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <input
              className="h-8 w-48 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              type="submit"
              className="h-8 rounded-md bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20"
            >
              Send details
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-2 text-sm font-semibold text-white/90">File upload (beta)</h3>
          <p className="mb-3 text-xs text-slate-400">Allowed: images &amp; PDF • Max 10 MB</p>
          {/* Only caller gets the uploader */}
          <FileUploader code={code} role="caller" />
        </div>
      </aside>
    </main>
  );
};

export default CallerSessionPage;
