"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, deleteField, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AckModal, { AckItem } from "@/components/ack/AckModal";

type PendingAckDoc = {
  id: "privacy" | "slot1" | "slot2";
  title: string;
  body?: string;
};

export default function AckWatcherCaller({ code }: { code: string }) {
  const [pending, setPending] = useState<PendingAckDoc | null>(null);

  useEffect(() => {
    const ref = doc(db, "sessions", code);
    return onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const pa = data.pendingAck;
      if (pa && pa.id && pa.title) {
        setPending({
          id: pa.id as PendingAckDoc["id"],
          title: String(pa.title || "Acknowledgement"),
          body: pa.body ? String(pa.body) : undefined,
        });
      } else {
        setPending(null);
      }
    });
  }, [code]);

  async function writeAck(status: "accepted" | "declined", item: PendingAckDoc) {
    const messagesRef = collection(db, "sessions", code, "messages");
    await addDoc(messagesRef, {
      role: "system",
      type: "ack",
      text: status === "accepted"
        ? `Caller accepted: ${item.title}`
        : `Caller declined: ${item.title}`,
      ack: { id: item.id, title: item.title, status },
      createdAt: serverTimestamp(),
    });

    const sessionRef = doc(db, "sessions", code);
    await updateDoc(sessionRef, {
      [`ackProgress.${item.id}`]: status === "accepted",
      pendingAck: deleteField(),
      lastAckAt: serverTimestamp(),
    });
  }

  if (!pending) return null;

  const ackItem: AckItem = { id: pending.id, title: pending.title, body: pending.body };

  return (
    <AckModal
      pendingAck={ackItem}
      onAccept={() => writeAck("accepted", pending)}
      onDecline={() => writeAck("declined", pending)}
    />
  );
}
