"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { db, storage } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc, addDoc, collection } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export default function CallerPage() {
  const params = useParams<{ code: string }>();
  const sessionId = params.code;

  // simple details form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function submitDetails() {
    const detailsRef = doc(db, "sessions", sessionId, "metadata", "details");
    await setDoc(detailsRef, { name, email, phone, updatedAt: serverTimestamp() });
    await addDoc(collection(db, "sessions", sessionId, "events"), {
      type: "DETAILS",
      role: "CALLER",
      createdAt: serverTimestamp(),
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const path = `sessions/${sessionId}/${Date.now()}_${f.name}`;
    const rf = ref(storage, path);
    await uploadBytes(rf, f);
    const url = await getDownloadURL(rf);
    await addDoc(collection(db, "sessions", sessionId, "events"), {
      type: "FILE",
      name: f.name,
      url,
      size: f.size,
      role: "CALLER",
      createdAt: serverTimestamp(),
    });
    e.target.value = "";
  }

  return (
    <main className="mx-auto max-w-5xl p-4 text-[#e6eefb]">
      <h1 className="mb-3 text-xl font-semibold">Secure shared chat</h1>

      {/* details */}
      <section className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-3">
        <input className="rounded-lg bg-white/10 p-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded-lg bg-white/10 p-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-lg bg-white/10 p-2 text-sm" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button onClick={submitDetails} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium md:col-span-3">
          Send details
        </button>
      </section>

      {/* upload */}
      <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <label className="block text-sm text-white/70 mb-1">File upload (images & PDF, up to 10 MB)</label>
        <input type="file" onChange={handleUpload} />
      </section>

      <ChatWindow sessionId={sessionId} role="CALLER" />
    </main>
  );
}
