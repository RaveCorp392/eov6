"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  code: string; // session code
};

export default function CallerDetailsForm({ code }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [busy, setBusy]       = useState(false);

  async function onSend() {
    if (busy) return;
    setBusy(true);
    try {
      // Write to a stable location the agent panel will read:
      // sessions/{code}/meta/caller
      await setDoc(
        doc(db, "sessions", code, "meta", "caller"),
        {
          fullName,
          email,
          phone,
          identified: !!(fullName || email || phone),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Details sent!");
      // Optional: clear inputs
      // setFullName(""); setEmail(""); setPhone("");
    } catch (e) {
      console.error(e);
      alert("Failed to send details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-white/90">Send your details</h3>
      <div className="flex gap-2">
        <input
          className="min-w-[14rem] rounded px-2 py-1 text-sm bg-white/5 text-white border border-white/10"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="min-w-[18rem] rounded px-2 py-1 text-sm bg-white/5 text-white border border-white/10"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="min-w-[12rem] rounded px-2 py-1 text-sm bg-white/5 text-white border border-white/10"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          onClick={onSend}
          disabled={busy}
          className="rounded bg-white/10 hover:bg-white/20 px-3 py-1 text-sm text-white border border-white/20"
        >
          {busy ? "Sending…" : "Send details"}
        </button>
      </div>
    </section>
  );
}
