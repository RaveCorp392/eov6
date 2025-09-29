"use client";

import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, orderBy, limit } from "firebase/firestore";
import { isInternalAdminClient } from "@/lib/is-internal";
import AuthBar from "@/components/AuthBar";

type Ticket = {
  id: string;
  code: string;
  name: string;
  email: string;
  subject: string;
  status: "open" | "closed" | string;
  priority?: string;
  assignedTo?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    (async () => {
      const staff = await isInternalAdminClient();
      setIsStaff(staff);
      if (!staff) {
        setLoading(false);
        return;
      }
      try {
        const q1 = query(
          collection(db, "tickets"),
          where("status", "==", "open"),
          orderBy("createdAt", "desc"),
          limit(200)
        );
        const snap1 = await getDocs(q1);
        const rows: Ticket[] = [];
        snap1.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        setTickets(rows);
      } catch (e: any) {
        const code = e?.code || "";
        const msg = e?.message || "Unknown error";
        if (code === "failed-precondition") {
          try {
            const q2 = query(
              collection(db, "tickets"),
              where("status", "==", "open"),
              limit(200)
            );
            const snap2 = await getDocs(q2);
            const rows2: Ticket[] = [];
            snap2.forEach((d) => rows2.push({ id: d.id, ...(d.data() as any) }));
            setTickets(rows2);
            setErr(
              "Using fallback (unsorted). Add composite index: tickets(status Asc, createdAt Desc) in Firestore Indexes."
            );
          } catch (e2: any) {
            setErr(`Firestore error: ${e2?.code || ""} ${e2?.message || ""}`);
          }
        } else if (code === "permission-denied") {
          setErr("Missing or insufficient permissions.");
        } else {
          setErr(`Firestore error: ${code} ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  async function assignMe(t: Ticket) {
    try {
      const me = auth.currentUser?.email || "staff@eov6.com";
      await updateDoc(doc(db, "tickets", t.id), { assignedTo: me, updatedAt: Date.now() });
      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, assignedTo: me } : x)));
    } catch {
      setErr("Failed to assign ticket (permissions).");
    }
  }

  async function closeTicket(t: Ticket) {
    try {
      await updateDoc(doc(db, "tickets", t.id), { status: "closed", updatedAt: Date.now() });
      setTickets((prev) => prev.filter((x) => x.id !== t.id));
    } catch {
      setErr("Failed to close ticket (permissions).");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Admin - Tickets</h1>
      <AuthBar />
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1" && (
        <div className="mb-3 rounded border bg-zinc-50 p-3 text-xs text-zinc-700">
          <div>
            <b>Client debug</b>
          </div>
          <div>
            Signed in as: {typeof window !== "undefined" ? ((window as any).firebase?.auth?.currentUser?.email || "(see AuthBar)") : "(n/a)"}
          </div>
          <div>Pre-check isStaff: {String(isStaff)}</div>
          <div>Tip: Server uses Firestore Rules isStaff() — ensure the exact lowercase email is allowlisted or @eov6.com.</div>
        </div>
      )}
      {isStaff === false && (
        <>
          <p className="text-zinc-700">
            This view is for EOV6 staff. Sign in with an EOV6 email or a temporarily allowed address.
          </p>
          <div className="mt-2 text-xs text-zinc-500">
            Staff (client pre-check): NEXT_PUBLIC_INTERNAL_DOMAIN / NEXT_PUBLIC_INTERNAL_ADMINS
            <br />
            Staff (authoritative): Firestore Rules isStaff() allowlist/domain
          </div>
        </>
      )}

      {isStaff && (
        <>
          {loading && <div className="mb-4 text-sm text-zinc-600">Loading...</div>}
          {err && <div className="mb-4 rounded bg-amber-100 text-amber-900 p-3">{err}</div>}
          {!loading && !tickets.length && !err && <div className="mb-4 text-sm text-zinc-600">No open tickets</div>}
          {!loading && !!tickets.length && (
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
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{t.code}</td>
                      <td className="px-3 py-2">{t.subject || "(no subject)"}</td>
                      <td className="px-3 py-2">
                        {t.name} <span className="text-zinc-500">&lt;{t.email}&gt;</span>
                      </td>
                      <td className="px-3 py-2">{t.assignedTo || "-"}</td>
                      <td className="px-3 py-2 flex gap-2">
                        <button className="rounded border px-2 py-1" onClick={() => assignMe(t)}>
                          Assign to me
                        </button>
                        <button className="rounded border px-2 py-1" onClick={() => closeTicket(t)}>
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
