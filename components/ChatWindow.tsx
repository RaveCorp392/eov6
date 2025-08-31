// components/ChatWindow.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMessages,
  sendMessage,
  ensureSession,
  type ChatMessage,
  type ChatRole,
} from "@/lib/firebase";

type Props = {
  sessionId: string;
  role: ChatRole; // "AGENT" | "CALLER"
};

export default function ChatWindow({ sessionId, role }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureSession(sessionId);
    const unsub = getMessages(sessionId, (m) => {
      setMsgs(m);
      // scroll to bottom on new messages
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    });
    return () => unsub();
  }, [sessionId]);

  async function handleSend() {
    const text = input;
    setInput("");
    await sendMessage(sessionId, role, text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // allow newline
        return;
      }
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="panel"
      style={{
        width: "100%",
        maxWidth: 560, // ≈ one-third typical desktop
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        ref={listRef}
        className="chatWrap"
        style={{
          height: 380,
          overflowY: "auto",
          paddingRight: 8,
          borderRadius: 10,
          border: "1px solid var(--line)",
          background: "var(--panel)",
        }}
      >
        {msgs.length === 0 ? (
          <div className="small" style={{ padding: 8 }}>
            No messages yet. Say hello!
          </div>
        ) : (
          msgs.map((m) => {
            const mine = m.role === role;
            return (
              <div
                key={m.id}
                className="chat-msg"
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    whiteSpace: "pre-wrap", // ← preserves Shift+Enter newlines
                    wordBreak: "break-word",
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: mine ? "#1e3a8a" : "#0b1327",
                    color: "var(--fg)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="col" style={{ gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          rows={3}
          className="input"
          aria-label="Chat message input"
        />
        <div className="small">Enter = send, Shift+Enter = newline.</div>
      </div>
    </div>
  );
}
