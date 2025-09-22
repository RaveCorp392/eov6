import { collection, query, orderBy, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribe to all session messages in chronological order.
 * Includes system + ack messages.
 */
export function watchMessages(code: string, cb: (rows: DocumentData[]) => void) {
  const ref = collection(db, "sessions", code, "messages");
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(rows);
  });
}
