"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";

interface PageProps {
  params: { code: string };
}

export default function CallerSessionPage({ params }: PageProps) {
  const { code } = params;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const saveDetails = async () => {
    if (!code) return;
    const identified = !!(name || email || phone);

    try {
      // 1) Write to the ROOT session doc (what AgentDetailsPanel expects)
      await setDoc(
        doc(db, "sessions", code),
        { name, email, phone, identified },
        { merge: true }
      );

      // 2) (Optional) Keep a mirror in a subdoc if you like that structure
      await setDoc(
        doc(db, "sessions", code, "details", "caller"),
        { name, email, phone, identified },
        { merge: true }
      );

      alert("Details sent!");
    } catch (err) {
      console.error("Error saving details:", err);
      alert("Failed to send details. Please try again.");
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="text-white/90">
        <h2 className="text-xl font-semibold">Secure shared chat</h2>
        <p className="text-sm text-slate-400">
          Visible to agent & caller • Ephemeral: cleared when the session ends.
        </p>
      </header>

      {/* Chat Window */}
      <ChatWindow code={code} role="caller" />

      {/* Caller Details Form */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <h3 className="mb-2 text-sm font-semibold text-white/90">Send your details</h3>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-white/10 bg-black/20 p-2 text-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-white/10 bg-black/20 p-2 text-white"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-white/10 bg-black/20 p-2 text-white"
          />
          <button
            onClick={saveDetails}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
          >
            Send details
          </button>
        </div>
      </section>

      {/* File Upload */}
      <FileUploader code={code} role="caller" />
    </main>
  );
}
