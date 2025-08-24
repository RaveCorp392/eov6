// app/s/[code]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import { expiryInHours, Msg } from "@/lib/code";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";

type Params = { params: { code: string } };

export default function CallerPage({ params }: Params) {
  const code = params.code;
  const router = useRouter();

  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);

  const sessRef = useMemo(() => doc(db, "sessions", code), [code]);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [code]
  );

  useEffect(() => {
    setDoc(
      sessRef,
      {
        createdAt: serverTimestamp(),
        expiresAt: expiryInHours(1),
      },
      { merge: true }
    );

    const unsubHeader = onSnapshot(sessRef, (snap) => {
      const d = snap.data() as any | undefined;
      if (d) {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
        setClosed(Boolean(d.closed));
      }
    });

    const unsubMsgs = onSnapshot(
      query(msgsRef, orderBy("at", "asc")),
      (snap) => {
        const rows: Msg[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          const row: Msg = {
            from: data.from,
            at: data.at,
          };
          if (data.text) row.text = data.text;
          if (data.fileUrl) {
            row.fileUrl = data.fileUrl;
            row.fileName = data.fileName;
            row.fileType = data.fileType;
            row.fileSize = data.fileSize;
          }
          rows.push(row);
        });
        setMessages(rows);
      }
    );

    return () => {
      unsubHeader();
      unsubMsgs();
    };
  }, [sessRef, msgsRef]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || closed) return;
    await addDoc(msgsRef, {
      text,
      from: "caller",
      at: serverTimestamp(),
    });
    setInput("");
  }

  async function sendDetails() {
    if (closed) return;
    await setDoc(
      sessRef,
      {
        name: name?.trim() || "",
        email: email?.trim() || "",
        phone: phone?.trim() || "",
        identified: Boolean(name || email || phone),
        expiresAt: expiryInHours(1),
      },
      { merge: true }
    );

    await addDoc(msgsRef, {
      text: "Contact details were provided.",
      from: "caller",
      at: serverTimestamp(),
    });
  }

  function leaveSession() {
    router.push("/");
  }

  const allowUploads =
    process.env.NEXT_PUBLIC_ALLOW_UPLOADS === "1" || true; // default on for demo

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-3">
      <div className="text-sm text-gray-600">
        Ephemeral session <b>{code}</b>. Data is cleared automatically by
        policy.
        {closed && (
          <span className="ml-2 text-red-600 font-semibold">
            (Session ended by agent)
          </span>
        )}
      </div>

      <div className="border rounded-lg p-4 h-[360px] overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[80%] ${
              m.from === "caller" ? "ml-auto text-right" : ""
            }`}
          >
            {m.fileUrl ? (
              <div className="inline-block rounded-lg px-3 py-2 bg-indigo-50">
                <a
                  className="underline"
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {m.fileName || "File"}
                </a>
                {typeof m.fileSize === "number" && (
                  <span className="ml-2 text-xs text-slate-600">
                    ({Math.ceil(m.fileSize / 1024)} KB)
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`inline-block rounded-lg px-3 py-2 ${
                  m.from === "caller" ? "bg-indigo-100" : "bg-gray-100"
                }`}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={closed}
        />
        <button
          onClick={sendMessage}
          disabled={closed}
          className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={closed}
        />
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={closed}
        />
        <input
          className="w-44 rounded border px-3 py-2"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={closed}
        />
        <button
          onClick={sendDetails}
          disabled={closed}
          className="rounded bg-violet-600 text-white px-3 py-2 shrink-0 disabled:opacity-50"
        >
          Send details
        </button>
      </div>

      {allowUploads && !closed && (
        <div className="pt-2">
          <FileUploader code={code} />
        </div>
      )}

      <button
        onClick={leaveSession}
        className="w-full rounded bg-gray-100 px-3 py-2"
      >
        Leave session
      </button>
    </div>
  );
}
