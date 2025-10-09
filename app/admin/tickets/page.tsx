"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import AuthBar from "@/components/AuthBar";
import { isInternalAdminClient } from "@/lib/is-internal";

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

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Missing auth token.");

      const res = await fetch("/api/admin/tickets/list", {
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText || "Failed to load tickets.");
      setTickets(json.tickets || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const staff = await isInternalAdminClient();
      setIsStaff(staff);
      if (staff) {
        await load();
      } else {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assignMe(id: string) {
    try {
      setErr(null);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Missing auth token.");

      const res = await fetch("/api/admin/tickets/assign", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || res.statusText || "Assign failed.");
      }
      const me = auth.currentUser?.email || null;
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo: me } : t)));
    } catch (e: any) {
      setErr(e?.message || "Assign failed.");
    }
  }

  async function closeTicket(id: string) {
    try {
      setErr(null);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Missing auth token.");

      const res = await fetch("/api/admin/tickets/close", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || res.statusText || "Close failed.");
      }
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      setErr(e?.message || "Close failed.");
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
          <div>Tip: Server honors ADMIN_ALLOWLIST and @eov6.com via API token.</div>
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
            Staff (authoritative, server): ADMIN_ALLOWLIST and @eov6.com via API
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
                        <button className="rounded border px-2 py-1" onClick={() => assignMe(t.id)}>
                          Assign to me
                        </button>
                        <button className="rounded border px-2 py-1" onClick={() => closeTicket(t.id)}>
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
