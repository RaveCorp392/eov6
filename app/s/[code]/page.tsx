// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { expiryInHours } from "@/lib/code";
import { Profile } from "@/lib/ivrConfig";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

// Minimal styles/hooks kept inline to avoid changing your design system.
// Replace with your actual components if you prefer.
export default function CallerPage() {
  const params = useParams();       // expects { code }
  const router = useRouter();
  const code = String(params?.code || "");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // If you already prefill from localStorage/Firestore, keep that here.
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("eov6_profile") || "{}");
      if (cached?.name) setName(cached.name);
      if (cached?.email) setEmail(cached.email);
      if (cached?.phone) setPhone(cached.phone);
    } catch {}
  }, []);

  useEffect(() => {
    const payload = { name, email, phone };
    localStorage.setItem("eov6_profile", JSON.stringify(payload));
  }, [name, email, phone]);

  const sendDetails = useCallback(async () => {
    if (!code) return;

    const profile: Profile = {
      name: name?.trim() || "",
      email: email?.trim() || "",
      phone: phone?.trim() || "",
    };

    // Upsert a profile doc (handy for agent sidebar)
    await setDoc(doc(db, "sessions", code, "meta", "profile"), {
      ...profile,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also emit a structured message into chat so the agent sees it immediately
    await addDoc(collection(db, "sessions", code, "messages"), {
      type: "profile",
      profile,
      identified: Boolean(profile.name || profile.email || profile.phone),
      createdAt: serverTimestamp(),
      expiresAt: expiryInHours(1),
    });
  }, [code, name, email, phone]);

  // IMPORTANT: Leave session is now *local-only*.
  // It does NOT delete/mark-ended the Firestore session.
  // The agent can continue; TTL will clean it up.
  const leaveSession = useCallback(() => {
    try { localStorage.removeItem("eov6_profile"); } catch {}
    // Option A: navigate to marketing landing
    router.push("/");
    // Option B (alternative): window.close() for popup flows
    // window.close();
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="text-sm text-gray-600 mb-2">
        Ephemeral session <b>{code}</b>. Data is cleared automatically by policy.
      </div>

      {/* Chat window placeholder — keep your existing ChatWindow if you have it */}
      <div className="rounded-lg border p-4 min-h-[360px] mb-3 bg-white">
        {/* Your chat component goes here */}
      </div>

      {/* Message box */}
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 border rounded-md px-3 py-2"
          placeholder="Type a message"
        />
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white">
          Send
        </button>
      </div>

      {/* Fast profile row */}
      <div className="flex gap-2 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="flex-1 border rounded-md px-3 py-2"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="flex-1 border rounded-md px-3 py-2"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-48 border rounded-md px-3 py-2"
        />
        <button
          onClick={sendDetails}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white"
          title="Send details to agent"
        >
          Send details
        </button>
      </div>

      <button
        onClick={leaveSession}
        className="w-full py-2 rounded-md bg-gray-100 border"
      >
        Leave session
      </button>
    </div>
  );
}
