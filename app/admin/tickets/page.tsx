"use client";

import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  updateDoc,
  where
} from "firebase/firestore";

type Ticket = {
  id: string;
  code: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  priority?: string;
  assignedTo?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  async function loadTickets() {
    setLoading(true);
    const q = query(
      collection(db, "tickets"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    const rows: Ticket[] = [];
    snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
    setTickets(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assignMe(ticket: Ticket) {
    const me = auth.currentUser?.email || "staff@eov6.com";
    await updateDoc(doc(db, "tickets", ticket.id), { assignedTo: me, updatedAt: Date.now() });
    loadTickets();
  }

  async function closeTicket(ticket: Ticket) {
    await updateDoc(doc(db, "tickets", ticket.id), { status: "closed", updatedAt: Date.now() });
    loadTickets();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Admin - Tickets</h1>
      <div className="mb-4 text-sm text-zinc-600">
        {loading ? "Loading..." : `${tickets.length} open ticket(s)`}
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Subject</th>
              <th className="text-left px-3 py-2">From</th>
              <th className="text-left px-3 py-2">Assigned</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t">
                <td className="px-3 py-2 font-mono">{ticket.code}</td>
                <td className="px-3 py-2">{ticket.subject || "(no subject)"}</td>
                <td className="px-3 py-2">
                  {ticket.name} <span className="text-zinc-500">&lt;{ticket.email}&gt;</span>
                </td>
                <td className="px-3 py-2">{ticket.assignedTo || "-"}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button className="rounded border px-2 py-1" onClick={() => assignMe(ticket)}>
                    Assign to me
                  </button>
                  <button className="rounded border px-2 py-1" onClick={() => closeTicket(ticket)}>
                    Close
                  </button>
                </td>
              </tr>
            ))}
            {!tickets.length && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={5}>
                  No open tickets
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
