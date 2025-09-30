"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { watchMessages } from "@/lib/watchMessages";
import { sendMessage, watchSession,
  type Role,
  targetLangFor,
} from "@/lib/firebase";
import AckLine from "@/components/chat/AckLine";
import SystemLine from "@/components/chat/SystemLine";

type Props = {
  code: string;
  role: Role;
  disabled?: boolean;
  showUpload?: boolean; // caller page true, agent page false
};

type ChatMsg = {
  id: string;
  role: "caller" | "agent" | "system";
  type: "text" | "file" | "system" | "ack";
  text?: string;
  createdAt?: any;
  ack?: { id?: string; title?: string; status?: "accepted" | "declined" };
  url?: string;
  orig?: any;
  lang?: any;
  meta?: any;
};

export default function ChatWindow({
  code,
  role,
  disabled,
  showUpload = false,
}: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    const off = watchMessages(code, (rows) => {
      const mapped: ChatMsg[] = rows.map((d: any, i: number) => ({
        id: String(d.id ?? d.docId ?? d._id ?? i),
        role: d.role ?? "system",
        type: d.type ?? "text",
        text: d.text,
        createdAt: d.createdAt,
        ack: d.ack,
        url: d.url,
        orig: d.orig,
        lang: d.lang,
        meta: d.meta,
      }));
      setMsgs(mapped);
    });
    return () => off();
  }, [code]);
  useEffect(() => watchSession(code, setSession), [code]);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (atBottom) {
      scrollToBottom(true);
    }
  }, [msgs.length, scrollToBottom]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    // live translate if enabled
    const tx = session?.translate;
    const live = tx?.enabled === true;
    const afterSend = () => {
      setInput("");
      scrollToBottom(true);
    };
    if (live) {
      const { src, tgt } = targetLangFor(role, tx);
      // If same-language, just send original and skip API
      if (src === tgt) {
        await sendMessage(code, role, text);
        afterSend();
        return;
      }
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, text, src, tgt, commit: true, sender: role }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "translate failed");
        afterSend();
        return;
      } catch (e) {
        alert("Translate/send failed. Sent original instead.");
      }
    }
    await sendMessage(code, role, text);
    afterSend();
  }, [code, input, role, session, scrollToBottom]);

  function displayTextFor(msg: ChatMsg) {
    if (!msg?.meta?.translated) return msg.text ?? "";
    if (role === msg.role) return msg?.orig?.text ?? msg.text ?? "";
    return msg.text ?? "";
  }

  function renderContent(msg: ChatMsg) {
    if (msg?.type === "file" && msg?.url) {
      const label = msg?.text || "file";
      return (
        <a
          href={msg.url}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-file inline-flex px-3 py-1.5 rounded-2xl break-words"
        >
          {label}
        </a>
      );
    }
    const primary = displayTextFor(msg);
    return <div className="whitespace-pre-wrap break-words">{primary}</div>;
  }

  function bubbleFor(msg: ChatMsg) {
    const mine = msg.role === role;
    const isFile = msg.type === "file" && !!msg.url;
    const align = mine ? "justify-end" : "justify-start";
    let innerClass = "max-w-[70%]";
    if (!isFile) {
      innerClass += mine
        ? " bg-blue-600 text-white rounded-2xl px-3 py-1.5"
        : " chat-text text-slate-900 rounded-2xl px-3 py-1.5";
    }
    return (
      <div key={msg.id} className={`flex ${align} my-1`}>
        <div className={innerClass}>{renderContent(msg)}</div>
      </div>
    );
  }

  function renderMessage(m: ChatMsg, i: number) {
    const key = m.id ?? String(i);
    if (m.type === "ack") return <AckLine key={key} m={m} />;
    if (m.type === "system" || m.role === "system") return <SystemLine key={key} m={m} />;
    return bubbleFor(m);
  }

  const uploadViaApi = useCallback(
    (file: File) => {
      return new Promise<{ url: string; name: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/upload/session?code=${encodeURIComponent(code)}`);
        xhr.responseType = "json";

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          const res = xhr.response;
          if (xhr.status >= 200 && xhr.status < 300 && res?.ok) {
            resolve({ url: res.url, name: res.name || file.name });
          } else {
            reject(new Error(res?.error || `upload_failed_${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("network_error"));

        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
      });
    },
    [code]
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        className="h-[55vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white/80 dark:bg-slate-900/60"
      >
        {msgs.map((m, i) => renderMessage(m, i))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              await send();
            }
          }}
          placeholder={
            disabled
              ? "Please accept the privacy notice to chat..."
              : "Type a message"
          }
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={disabled}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>

        {showUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const okType =
                  file.type.startsWith("image/") ||
                  file.type === "application/pdf" ||
                  /\.(png|jpe?g|gif|webp|bmp|svg|pdf)$/i.test(file.name);
                if (!okType) {
                  alert("Please select an image or PDF file.");
                  e.currentTarget.value = "";
                  return;
                }
                try {
                  setUploadProgress(0);
                  const { url, name } = await uploadViaApi(file);
                  await sendMessage(code, {
                    sender: role,
                    type: "file",
                    url,
                    text: name,
                  });
                  scrollToBottom(true);
                } catch (error) {
                  alert(
                    "Upload failed. Please retry — browser extensions (e.g. ad-blockers) can interfere."
                  );
                } finally {
                  setUploadProgress(null);
                  e.currentTarget.value = "";
                }
              }}
            />
            <button
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Upload
            </button>
            {uploadProgress !== null && (
              <span className="upload-progress">{uploadProgress}%</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
