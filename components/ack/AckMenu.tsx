"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { orgIdFromEmail } from "@/lib/org";
import { devlog } from "@/lib/devlog";
import { useAgentMembership } from "@/lib/agent-membership";

type AckId = "privacy" | "slot1" | "slot2";
type AckTemplate = {
  id: AckId;
  title: string;
  body: string;
  required?: boolean;
  disabled?: boolean;
};
type ToastState = { message: string; tone: "success" | "error" } | null;

async function sendAckRequest(code: string, item: { id: AckId; title: string; body?: string }) {
  const ref = doc(db, "sessions", code);
  await updateDoc(ref, {
    pendingAck: {
      id: item.id,
      title: item.title,
      body: item.body || "",
      requestedAt: serverTimestamp(),
      requestedBy: "agent",
    },
  });
}

export default function AckMenu({ code, orgId: propOrgId, membershipReady = true }: { code: string; orgId?: string; membershipReady?: boolean }) {
  const { orgId: ctxOrgId } = useAgentMembership();
  const [email, setEmail] = useState<string | null>(null);
  const [stateOrgId, setStateOrgId] = useState("default");
  const [privacy, setPrivacy] = useState<AckTemplate | null>(null);
  const [slots, setSlots] = useState<AckTemplate[]>([]);
  const [ackProgress, setAckProgress] = useState<Record<string, boolean | undefined>>({});
  const [pendingAck, setPendingAck] = useState<{ id: string; title: string; body?: string } | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const off = auth.onAuthStateChanged((u) => {
      const e = u?.email || null;
      setEmail(e);
      setStateOrgId(orgIdFromEmail(e));
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const id = propOrgId || ctxOrgId || stateOrgId || undefined;
    if (!id) return;

    const off = onSnapshot(doc(db, "orgs", id), async (snap) => {
      if (!snap.exists()) {
        setPrivacy(null);
        setSlots([]);
        return;
      }

      const data = snap.data() as any;
      const privacyText = String((data?.texts?.privacyStatement || data?.texts?.ackTemplate || "").trim());
      setPrivacy(
        privacyText
          ? { id: "privacy", title: "Privacy acknowledgement", body: privacyText }
          : null
      );

      let rawSlots: any[] = Array.isArray(data?.acks?.slots) ? data.acks.slots : [];
      if (!rawSlots.length) {
        try {
          const qs = await getDocs(collection(db, "orgs", id, "ackTemplates"));
          rawSlots = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch (err) {
          console.error("[ack] load slots", err);
        }
      }

      const mapped: AckTemplate[] = (rawSlots || [])
        .filter((s) => s && (s.title || s.body))
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        .map((s) => {
          const ackId = (String(s.id || "slot1") as AckId);
          return {
            id: ackId,
            title: String(s.title || "Acknowledgement"),
            body: String(s.body || ""),
            required: !!s.required,
          };
        });

      setSlots(mapped);
    });

    return () => off();
  }, [propOrgId, ctxOrgId, stateOrgId]);

  useEffect(() => {
    const off = onSnapshot(doc(db, "sessions", code), (snap) => {
      const data = snap.data() || {};
      setAckProgress((data.ackProgress || {}) as Record<string, boolean | undefined>);
      const pa = data.pendingAck;
      setPendingAck(pa && pa.id ? { id: String(pa.id), title: String(pa.title || "Acknowledgement"), body: pa.body } : null);
    });
    return () => off();
  }, [code]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const effectiveOrgId = propOrgId || ctxOrgId || stateOrgId;
      const reason = !effectiveOrgId ? "no-orgId" : !privacy && slots.length === 0 ? "no-slots" : "ok";
      devlog("ack-menu", {
        code,
        effectiveOrgId,
        ctxOrgId,
        reason,
        itemsCount: (privacy ? 1 : 0) + slots.length,
        email,
      });
      if (effectiveOrgId && ctxOrgId && effectiveOrgId !== ctxOrgId) {
        devlog("org-mismatch", { effectiveOrgId, orgIdFromContext: ctxOrgId });
      }
    }
  }, [propOrgId, ctxOrgId, stateOrgId, privacy, slots.length, code, email]);

  const items = useMemo(() => {
    const hasPending = Boolean(pendingAck);
    const list: AckTemplate[] = [];
    if (privacy) list.push({ ...privacy, disabled: ackProgress?.[privacy.id] === true || hasPending });
    slots.forEach((slot) => {
      list.push({ ...slot, disabled: ackProgress?.[slot.id] === true || hasPending });
    });
    return list;
  }, [privacy, slots, ackProgress, pendingAck]);

  const nextAck = useMemo(() => {
    if (privacy && ackProgress?.privacy !== true) return privacy;
    return slots.find((s) => s.required && ackProgress?.[s.id] !== true) || null;
  }, [privacy, slots, ackProgress]);

  async function handleRequest(item: AckTemplate) {
    if (item.disabled || busy || pendingAck) return;
    setBusy(true);
    try {
      await sendAckRequest(code, { id: item.id, title: item.title, body: item.body });
      setToast({ tone: "success", message: `${item.title} requested` });
    } catch (err: any) {
      console.error("[ack/request]", err?.message || err);
      setToast({ tone: "error", message: "Acknowledgement request failed" });
    } finally {
      setBusy(false);
      if (detailsRef.current) detailsRef.current.open = false;
    }
  }

  if (!membershipReady) {
    return (
      <div className="relative inline-flex">
        <button data-testid="ack-menu" className="inline-flex cursor-not-allowed items-center rounded-md bg-blue-600/50 px-3 py-2 text-sm text-white" disabled>
          Send acknowledgement
        </button>
      </div>
    );
  }

  const summaryLabel = pendingAck
    ? `Awaiting acknowledgement (${pendingAck.title})`
    : nextAck
      ? `Send acknowledgement (Next: ${nextAck.title})`
      : "Send acknowledgement";

  return (
    <div className="relative inline-flex">
      <details ref={detailsRef} className="group">
        <summary
          data-testid="ack-menu"
          className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {summaryLabel}
        </summary>
        <div className="absolute z-10 mt-2 w-80 rounded-md border bg-white shadow-md">
          {items.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No templates found.</div>
          ) : (
            <ul className="p-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    data-testid={item.id === "privacy" ? "ack-privacy" : item.id === "slot1" ? "ack-slot1" : item.id === "slot2" ? "ack-slot2" : undefined}
                    onClick={() => handleRequest(item)}
                    disabled={Boolean(item.disabled) || busy}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div
            className={`min-w-[220px] rounded-lg px-4 py-3 text-sm shadow-lg ${
              toast.tone === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-1 text-[10px] text-slate-500">
          {(() => {
            const effectiveOrgId = propOrgId || ctxOrgId || stateOrgId;
            const reason = !effectiveOrgId ? "no-orgId" : !privacy && slots.length === 0 ? "no-slots" : "ok";
            const itemCount = (privacy ? 1 : 0) + slots.length;
            return `ack: ${reason} | org: ${effectiveOrgId || "-"} | items: ${itemCount}`;
          })()}
        </div>
      )}
    </div>
  );
}
