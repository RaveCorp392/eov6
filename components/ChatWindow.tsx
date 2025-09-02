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

function fileNameFromHref(href: string): string {
  try {
    const u = new URL(href);
    const last = (u.pathname.split("/").pop() || "").split("?")[0];
    return decodeURIComponent(last || "Attachment");
  } catch {
    const last = (href.split("/").pop() || "").split("?")[0];
    return decodeURIComponent(last || "Attachment");
  }
}

type FileKind = "image" | "pdf" | "file";
function getFileKind(href: string, contentType?: string): FileKind {
  const h = href.toLowerCase();
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("pdf") || /\.pdf($|\?)/.test(h)) return "pdf";
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/.test(h)) return "image";
  return "file";
}

function Icon({ kind }: { kind: FileKind }) {
  // tiny inline SVGs – no external deps
  if (kind === "pdf") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#ef4444" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path fill="#fff" d="M14 2v6h6" />
        <text x="7" y="17" fontSize="8" fill="#fff" fontFamily="system-ui, sans-serif">PDF</text>
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#38bdf8"/>
        <circle cx="9" cy="9" r="2.2" fill="#fff"/>
        <path d="M5 17l5-5 3 3 3-2 3 4H5z" fill="#0ea5e9"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#818cf8" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path fill="#c7d2fe" d="M14 2v6h6" />
    </svg>
  );
}

function FileChip({
  href,
  name,
  contentType,
}: {
  href: string;
  name?: string;
  contentType?: string;
}) {
  const display = name || fileNameFromHref(href);
  const kind = getFileKind(href, contentType);
  return (
    <a className="fileChip" href={href} target="_blank" rel="noreferrer" title={display}>
      <span className="chipIcon"><Icon kind={kind} /></span>
      <span className="chipLabel">{display}</span>
      <style jsx>{`
        .fileChip {
          display: inline-flex; gap: 8px; align-items: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid #1e293b;
          border-radius: 12px; padding: 8px 10px;
          text-decoration: none; color: #e6eefb;
          max-width: 100%; overflow: hidden;
        }
        .chipIcon { flex: 0 0 auto; display: inline-flex; }
        .chipLabel {
          display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 22rem; /* keeps it tidy inside the bubble */
        }
      `}</style>
    </a>
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Focus + bring composer fully into view (caller + agent)
  useEffect(() => {
    try { textareaRef.current?.focus({ preventScroll: true } as any); } catch { textareaRef.current?.focus(); }
    // ensure bottom of page is visible once mounted
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!session) return;
    const unsub = getMessages(session, (msgs: any[] = []) => {
      const safe = (msgs || []).map((m: any, i: number) => ({ id: m.id ?? `${i}`, ...m }));
      setMessages(safe);
    });
    return () => { try { typeof unsub === "function" && unsub(); } catch {} };
  }, [session]);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const doSend = useCallback(async () => {
    const text = normalizeOutgoing(input);
    if (!text || !session || sending) return;
    setSending(true);
    try {
      await sendMessage(session, { text, sender: props.role, ts: Date.now() });
      setInput("");
      try { textareaRef.current?.focus({ preventScroll: true } as any); } catch { textareaRef.current?.focus(); }
      // make sure we land fully at the bottom (caller page tweak)
      requestAnimationFrame(() => {
        textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        if (viewportRef.current) {
          viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
        }
        if (typeof window !== "undefined") {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        }
      });
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
        <div ref={viewportRef} className="viewport" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty">No messages yet. Say hello!</p>
          ) : (
            <ul className="list">
              {messages.map((m: any) => {
                const isAgent = m.sender === "AGENT";

                // URL-only text → treat as file/link
                const urlOnly = typeof m.text === "string" && /^(https?:\/\/\S+)$/i.test(m.text.trim());
                const hrefFromText = urlOnly ? m.text.trim() : "";

                const fileHref =
                  m?.file?.downloadURL ||
                  m?.file?.url ||
                  m?.downloadURL ||
                  hrefFromText;

                const isFile =
                  m?.type === "file" ||
                  (!!fileHref && (urlOnly || !m?.text?.trim()));

                return (
                  <li key={m.id} className={`row ${isAgent ? "left" : "right"}`}>
                    <div className={`who ${isAgent ? "agent" : "caller"}`}>
                      {isAgent ? "Agent" : "You"}
                    </div>
                    <div className={`bubble ${isAgent ? "agent" : "caller"}`}>
                      {isFile ? (
                        <FileChip
                          href={fileHref}
                          name={m?.file?.name}
                          contentType={m?.file?.contentType}
                        />
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
            ref={textareaRef}
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

      <style jsx>{`
        .chatRoot { width: 100%; display: flex; justify-content: center; }
        .chatFrame { width: 100%; max-width: 560px; margin: 0 auto; }
        @media (min-width: 1024px) { .chatFrame { max-width: 33vw; } }

        .viewport {
          height: 70vh; overflow-y: auto; background: #0f172a;
          border: 1px solid #1e293b; border-radius: 16px; padding: 16px;
        }
        .empty { color: #94a3b8; font-size: 0.9rem; }

        .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; }
        .row.left  { justify-content: flex-start; }
        .row.right { justify-content: flex-end; }

        .who { font-size: 12px; margin: 0 8px 6px 8px; opacity: 0.85; }
        .who.agent { color: #7dd3fc; }
        .who.caller { color: #6ee7b7; text-align: right; }

        .bubble {
          max-width: 75%; padding: 10px 14px; border-radius: 18px;
          line-height: 1.45; color: white; white-space: pre-wrap;
        }
        .bubble.agent { background: #0369a1; }
        .bubble.caller { background: #334155; }

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
