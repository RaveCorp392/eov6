"use client";

import React, { useEffect, useState } from "react";
import {
  db,
  collection,
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

export default function AgentConsolePage({ params }: PageProps) {
  const sessionCode = params.code;
  const [events, setEvents] = useState<Event[]>([]);
  const [details, setDetails] = useState<{ name?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    const q = query(
      collection(db, "sessions", sessionCode, "events"),
      orderBy("ts", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
      setEvents(rows);

      // latest DETAILS in the stream wins
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].type === "DETAILS") {
          const d = rows[i] as any;
          setDetails({ name: d.name, email: d.email, phone: d.phone });
          break;
        }
      }
    });
    return () => unsub();
  }, [sessionCode]);

  return (
    <main style={{ padding: 16, color: "#e6eefb", background: "#0b1220", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 8 }}>Agent console</h1>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
        Session <strong>{sessionCode}</strong>
      </div>

      {/* Caller details panel */}
      <section style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, marginBottom: 6 }}>Caller details</h3>
        <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          Name — {details.name ?? "—"}
          {"\n"}email — {details.email ?? "—"}
          {"\n"}Phone — {details.phone ?? "—"}
          {"\n"}identified — {details.name || details.email || details.phone ? "Yes" : "No"}
        </div>
      </section>

      {/* Event feed – no file previews, just links */}
      <section>
        <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {events.map((ev) => {
            if (ev.type === "CHAT") {
              const c = ev as any;
              return (
                <div key={ev.id}>
                  {c.role}:{c.text}
                </div>
              );
            }
            if (ev.type === "DETAILS") {
              return (
                <div key={ev.id}>SYSTEM: Caller details were shared with the agent.</div>
              );
            }
            if (ev.type === "FILE") {
              const f = ev as any;
              const kb = Math.round((f.size ?? 0) / 102.4) / 10;
              // Show exactly as a link; agent can click to open in new tab.
              return (
                <div key={ev.id}>
                  {f.role} file:{" "}
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#9bd" }}>
                    {f.name} ({kb} KB)
                  </a>
                </div>
              );
            }
            return <div key={ev.id}>SYSTEM event</div>;
          })}
        </div>
      </section>
    </main>
  );
}
