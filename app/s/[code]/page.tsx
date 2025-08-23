"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp,
  getFirestore
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { expiryInHours, Msg } from "@/lib/code";

export default function Caller({ params }: { params: { code: string } }) {
  const code = params.code;
  const db = useMemo(() => getFirestore(app), []);
  const msgsRef = useMemo(
    () => collection(db, "sessions", code, "messages"),
    [db, code]
  );

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Subscribe to messages
  useEffect(() => {
    const q = query(msgsRef, orderBy("at", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMsgs(snap.docs.map((d) => d.data() as Msg));
        setErr(null);
      },
      (e) => {
        console.error("onSnapshot error:", e);
        setErr(e.message);
      }
    );
    return () => unsub();
  }, [msgsRef]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    try {
      await addDoc(msgsRef, {
        text,
        from: "caller",
        at: serverTimestamp(),
        expiresAt: expiryInHours(1),
      } as Msg);
      setInput("");
    } catch (e: any) {
      console.error("send() failed:", e);
      setErr(e.message ?? String(e));
      alert("Send failed: " + (e.message ?? String(e)));
    }
  }

  // …render (show `err` somewhere small if present) …
}
