"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMessages, sendMessage } from "@/lib/firebase";
import type { ChatMessage, Role } from "@/lib/firebase";

type ChatWindowProps = {
  sessionId?: string;
  sessionCode?: string;
  role: Role; // "AGENT" | "CALLER"
};

function normalizeOutgoing(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function FileBubble({ href, name }: { href: string; name?: string }) {
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(href);
  return (
    <div className="fileBubble">
      <div className="fileName">{name || "Attachment"}</div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={href} target="_blank" rel="noreferrer">
          <img src={href} alt={name || "image"} />
        </a>
      ) : (
        <a className="fileLink" href={href} target="_blank" rel="noreferrer">
          {href}
        </a>
      )}
    </div>
  );
}

export default function ChatWindow(props: ChatWindowProps) {
  const session = useMemo(
    () => props.sessionId || props.sessionCode || "",
    [props.sessionId, props.sessionCode]
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[] | any[]>([]);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session) return;
    const unsub = getMessages(session, (msgs: any[] = []) => {
      const safe = (msgs || []).map((m: any, i: number) => ({ id: m.id ?? `${i}`, ...m }));
      setMessages(safe);
    });
    return () => {
      try { typeof unsub === "function" && unsub(); } catch {}
    };
  }, [session]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const doSend = useCallback(async () => {
    const text = normalizeOutgoing(input);
    if (!text || !session || sending) return;
    setSending(true);
    try {
      await sendMessage(session, { text, sender: props.role, ts: Date.now() });
      setInput("");
    } finally {
      setSending(false);
    }
  }, [input, session, props.role, sending]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  };

  return (
    <div className="chatRoot">
      <div className="chatFrame">
        <div className="viewport" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty">No messages yet. Say hello!</p>
          ) : (
            <ul className="list">
              {messages.map((m: any) => {
                const isAgent = m.sender === "AGENT";
                // Support both rich file messages and simple text-with-URL fallback
                const fileHref = m?.file?.downloadURL || m?.file?.url || m?.downloadURL || "";
                const isFile = m?.type === "file" || (!!fileHref && !m?.text?.trim());
                return (
                  <li key={m.id} className={`row ${isAgent ? "left" : "right"}`}>
                    <div className={`who ${isAgent ? "agent" : "caller"}`}>
                      {isAgent ? "Agent" : "You"}
                    </div>
                    <div className={`bubble ${isAgent ? "agent" : "caller"}`}>
                      {isFile ? (
                        <FileBubble href={fileHref} name={m?.file?.name} />
                      ) : (
                        <div className="text">{m.text}</div>
                      )}
                    </div>
                  </li>
                );
              })}
              <div ref={endRef} />
            </ul>
          )}
        </div>

        <div className="composer">
          <textarea
            rows={2}
            placeholder="Type a message… (Enter = send, Shift+Enter = newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button onClick={() => void doSend()} disabled={!input.trim() || sending} type="button">
            Send
          </button>
        </div>

        <p className="hint">
          Press <kbd>Enter</kbd> to send,&nbsp;<kbd>Shift+Enter</kbd> for a new line.
        </p>
      </div>

      {/* Local CSS so this looks right even if Tailwind isn't applied */}
      <style jsx>{`
        .chatRoot { width: 100%; display: flex; justify-content: center; }
        .chatFrame { width: 100%; max-width: 560px; }
        @media (min-width: 1024px) { .chatFrame { max-width: 33vw; } }

        .viewport {
          height: 70vh;
          overflow-y: auto;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 16px;
        }
        .empty { color: #94a3b8; font-size: 0.9rem; }

        .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; }
        .row.left  { justify-content: flex-start; }
        .row.right { justify-content: flex-end; }

        .who { font-size: 12px; margin: 0 8px 6px 8px; opacity: 0.85; }
        .who.agent { color: #7dd3fc; }    /* sky-300 */
        .who.caller { color: #6ee7b7; text-align: right; } /* emerald-300 */

        .bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 18px;
          line-height: 1.45;
          color: white;
          white-space: pre-wrap;
        }
        .bubble.agent { background: #0369a1; }  /* sky-700 */
        .bubble.caller { background: #334155; } /* slate-700 */

        .fileBubble { display: grid; gap: 8px; }
        .fileName { font-size: 12px; opacity: 0.85; }
        .fileLink { text-decoration: underline; word-break: break-all; }
        .fileBubble img { max-width: 100%; border-radius: 12px; }

        .composer { display: flex; gap: 8px; margin-top: 12px; align-items: flex-start; }
        .composer textarea {
          flex: 1; min-height: 44px; resize: vertical;
          background: #0b1327; color: #e6f2ff;
          border: 1px solid #1e293b; border-radius: 12px; padding: 10px;
          outline: none;
        }
        .composer textarea:focus { box-shadow: 0 0 0 2px #0284c7; }
        .composer button {
          height: 44px; padding: 0 14px; border-radius: 12px;
          color: white; background: #0284c7; border: 1px solid #1e293b;
        }
        .composer button:disabled { opacity: 0.6; }
        .hint { color: #94a3b8; font-size: 12px; margin-top: 6px; }
      `}</style>
    </div>
  );
}
