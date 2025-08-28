"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import {
  db,
  storage,
  serverTimestamp,
  collection,
  addDoc,
  storageRef,
  uploadBytes,
  getDownloadURL,
  query,
  orderBy,
  onSnapshot,
} from "@/lib/firebase";

type PageProps = { params: { code: string } };

type Event =
  | { id: string; type: "CHAT"; role: "CALLER" | "AGENT"; text: string; ts?: any }
  | {
      id: string;
      type: "DETAILS";
      name: string;
      email: string;
      phone: string;
      ts?: any;
    }
  | {
      id: string;
      type: "FILE";
      role: "CALLER" | "AGENT";
      name: string;
      size: number;
      url: string;
      contentType?: string;
      ts?: any;
    }
  | { id: string; [k: string]: any };

export default function CallerSessionPage({ params }: PageProps) {
  const sessionCode = params.code;

  // simple local UI state
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendingDetails, setSendingDetails] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [uploading, setUploading] = useState(false);

  // Subscribe to the session events so the caller page can show the same feed
  useEffect(() => {
    const q = query(
      collection(db, "sessions", sessionCode, "events"),
      orderBy("ts", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[]
      );
    });
    return () => unsub();
  }, [sessionCode]);

  async function sendChat() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "sessions", sessionCode, "events"), {
      type: "CHAT",
      role: "CALLER",
      text: trimmed,
      ts: serverTimestamp(),
    });
    setText("");
  }

  async function sendDetails() {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert("Please fill name, email and phone.");
      return;
    }
    setSendingDetails(true);
    try {
      await addDoc(collection(db, "sessions", sessionCode, "events"), {
        type: "DETAILS",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ts: serverTimestamp(),
      });
      alert("Details sent!");
    } catch (e) {
      console.error(e);
      alert("Failed to send details. Please try again.");
    } finally {
      setSendingDetails(false);
    }
  }

  async function onChooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB cap (same as before)
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      alert("Max file size is 10 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const path = `uploads/${sessionCode}/${Date.now()}-${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type || undefined });
      const url = await getDownloadURL(ref);

      // Write a FILE event—no preview, just metadata + URL.
      await addDoc(collection(db, "sessions", sessionCode, "events"), {
        type: "FILE",
        role: "CALLER",
        name: file.name,
        size: file.size,
        url,
        contentType: file.type || null,
        ts: serverTimestamp(),
      });

      alert("Uploaded.");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <main style={{ padding: 16, color: "#e6eefb", background: "#0b1220", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 8 }}>Secure shared chat</h1>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        Visible to agent &amp; caller • Ephemeral: cleared when the session ends.
      </div>

      {/* Event feed (simple) */}
      <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", marginBottom: 12 }}>
        {events.map((ev) => {
          if (ev.type === "CHAT") {
            return (
              <div key={ev.id}>
                {(ev as any).role}:{(ev as any).text}
              </div>
            );
          }
          if (ev.type === "DETAILS") {
            const d = ev as any;
            return (
              <div key={ev.id}>SYSTEM: Caller details were shared with the agent.</div>
            );
          }
          if (ev.type === "FILE") {
            const f = ev as any;
            const kb = Math.round((f.size ?? 0) / 102.4) / 10; // one decimal
            return (
              <div key={ev.id}>
                CALLER file:{" "}
                <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#9bd" }}>
                  {f.name} ({kb} KB)
                </a>
              </div>
            );
          }
          return <div key={ev.id}>SYSTEM event</div>;
        })}
      </div>

      {/* Chat box */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          style={{ width: 260, marginRight: 6 }}
        />
        <button onClick={sendChat}>Send</button>
      </div>

      {/* Send details */}
      <div style={{ marginBottom: 10, fontWeight: 600 }}>Send your details</div>
      <div style={{ marginBottom: 18 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={{ width: 200, marginRight: 6 }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: 240, marginRight: 6 }}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          style={{ width: 160, marginRight: 6 }}
        />
        <button disabled={sendingDetails} onClick={sendDetails}>
          {sendingDetails ? "Sending…" : "Send details"}
        </button>
      </div>

      {/* Upload — images & PDF only; max 10 MB */}
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>File upload (beta)</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
          Allowed: images &amp; PDF • Max 10 MB
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={uploading}
          onChange={onChooseFile}
        />
      </div>
    </main>
  );
}
