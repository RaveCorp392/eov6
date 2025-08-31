// components/ChatWindow.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Role = "AGENT" | "CALLER";

type ChatWindowProps = {
  sessionCode: string;
  role: Role;
};

// NOTE: Replace these stubs with your existing data layer (subscribe/send).
type Msg = { id: string; from: Role | "SYSTEM"; text: string };
async function sendMessageStub(_session: string, _role: Role, _text: string) {}
function useMessagesStub(_session: string) {
  const [msgs] = useState<Msg[]>([]);
  return msgs;
}

export default function ChatWindow({ sessionCode, role }: ChatWindowProps) {
  // If you already have hooks for messages and send, plug them here.
  const messages = useMessagesStub(sessionCode);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await sendMessageStub(sessionCode, role, text); // keep original whitespace
    setText("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div
        className="
          w-full max-w-[720px]
          rounded-2xl border border-white/10 bg-[#0f1730]/60
          shadow-[0_10px_30px_rgba(0,0,0,0.3)]
          p-0 overflow-hidden
        "
      >
        {/* Messages */}
        <div
          ref={listRef}
          className="
            h-[70vh] overflow-y-auto p-4
            space-y-3
          "
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`
                max-w-[85%] rounded-2xl px-4 py-3
                ${m.from === "AGENT"
                  ? "ml-auto bg-blue-600/90 text-white"
                  : m.from === "CALLER"
                  ? "mr-auto bg-white/10 text-[#e6eefb] border border-white/10"
                  : "mx-auto bg-yellow-500/15 text-yellow-200 border border-yellow-500/20"}
              `}
            >
              {/* PRE-WRAP → Shift+Enter renders as new lines */}
              <div className="whitespace-pre-wrap break-words text-[15px] leading-6">
                {m.text}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-center text-white/45 pt-10 text-sm">
              No messages yet. Say hello!
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…  (Enter = send, Shift+Enter = newline)"
              rows={2}
              className="
                flex-1 resize-y min-h-[44px] max-h-[160px]
                rounded-xl px-3 py-2
                bg-[#0b1220] text-[#e6eefb] placeholder-white/35
                border border-white/15 focus:border-white/35 outline-none
              "
            />

            <button
              onClick={() => void send()}
              disabled={!text.trim()}
              className="
                shrink-0 rounded-xl px-4 h-[44px]
                bg-blue-600 text-white font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-blue-500 transition
              "
            >
              Send
            </button>
          </div>

          <p className="mt-2 text-xs text-white/45">
            Press <span className="text-white">Enter</span> to send,{" "}
            <span className="text-white">Shift+Enter</span> for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
