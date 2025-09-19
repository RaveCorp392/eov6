"use client";

import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { orgIdFromEmail } from "@/lib/org";
import { devlog } from "@/lib/devlog";
import { useAgentMembership } from "@/lib/agent-membership";

type AckT = { id: "privacy" | "slot1" | "slot2"; title: string; body: string; required?: boolean };

export default function AckMenu({ code, orgId: propOrgId, membershipReady = true }: { code: string; orgId?: string; membershipReady?: boolean }) {
  const { orgId: ctxOrgId } = useAgentMembership();
  const [email, setEmail] = useState<string | null>(null);
  const [stateOrgId, setStateOrgId] = useState("default");
  const [privacy, setPrivacy] = useState<AckT | null>(null);
  const [slots, setSlots] = useState<AckT[]>([]);
  const [ackProgress, setAckProgress] = useState<Record<string, boolean | undefined>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = auth.onAuthStateChanged((u) => {
      const e = u?.email || null;
      setEmail(e);
      setStateOrgId(orgIdFromEmail(e));
    });
    return () => off();
  }, []);

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
      setPrivacy(privacyText ? { id: "privacy", title: "Privacy acknowledgement", body: privacyText } : null);

      let rawSlots: any[] = Array.isArray(data?.acks?.slots) ? data.acks.slots : [];
      // Fallback to legacy subcollection
      if (!rawSlots.length) {
        try {
          const qs = await getDocs(collection(db, "orgs", id, "ackTemplates"));
          rawSlots = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch {}
      }
      const mapped: AckT[] = (rawSlots || [])
        .filter((s) => s && (s.title || s.body))
        .sort((a, b) => (Number(a?.order || 0) - Number(b?.order || 0)))
        .map((s) => ({ id: s.id, title: String(s.title || "Acknowledgement"), body: String(s.body || ""), required: !!s.required }));
      setSlots(mapped);
    });
    return () => off();
  }, [propOrgId, ctxOrgId, stateOrgId]);

  // Dev debug to help trace empty templates
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const effectiveOrgId = propOrgId || ctxOrgId || stateOrgId;
      const reason = (!effectiveOrgId) ? 'no-orgId' : (!privacy && slots.length===0 ? 'no-slots' : 'ok');
      devlog('ack-menu', { code, effectiveOrgId, ctxOrgId, reason, itemsCount: (privacy?1:0)+slots.length });
      if (effectiveOrgId && ctxOrgId && effectiveOrgId !== ctxOrgId) {
        devlog('org-mismatch', { effectiveOrgId, orgIdFromContext: ctxOrgId });
      }
    }
  }, [propOrgId, ctxOrgId, stateOrgId, privacy, slots.length]);

  useEffect(() => {
    const off = onSnapshot(doc(db, "sessions", code), (snap) => {
      const p = (snap.data() as any)?.ackProgress || {};
      setAckProgress(p);
    });
    return () => off();
  }, [code]);

  const menu = useMemo(() => {
    const items: AckT[] = [];
    if (privacy) items.push(privacy);
    items.push(...slots);
    return items;
  }, [privacy, slots]);

  function getNextAck(): AckT | null {
    if (privacy && ackProgress?.privacy !== true) return privacy;
    const next = slots.find((s) => s.required && ackProgress?.[s.id] !== true);
    return next || null;
  }

  async function sendAck(t: AckT) {
    setBusy(true);
    try {
      const sessRef = doc(db, "sessions", code);
      await updateDoc(sessRef, {
        pendingAck: { id: t.id, title: t.title, body: t.body },
        ackRequestedAt: serverTimestamp(),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!membershipReady) {
    return (
      <div className="relative inline-flex">
        <button data-testid="ack-menu" className="cursor-not-allowed inline-flex items-center rounded-md bg-blue-600/50 text-white px-3 py-2 text-sm" disabled>
          Send acknowledgement
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex">
      <details className="group">
        <summary data-testid="ack-menu" className="cursor-pointer inline-flex items-center rounded-md bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600">
          {(() => { const n = getNextAck(); return n ? `Send acknowledgement (Next: ${n.title})` : 'Send acknowledgement'; })()}
        </summary>
        <div className="absolute z-10 mt-2 w-80 rounded-md border bg-white shadow-md">
          {menu.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No templates found.</div>
          ) : (
            <ul className="p-1">
              {menu.map((t) => (
                <li key={t.id}>
                  <button
                    data-testid={t.id === 'privacy' ? 'ack-privacy' : t.id === 'slot1' ? 'ack-slot1' : 'ack-slot2'}
                    onClick={() => sendAck(t)}
                    disabled={busy || (ackProgress?.[t.id] === true)}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
      {process.env.NODE_ENV !== 'production' && (
        <div className="text-[10px] text-slate-500 mt-1">
          {(() => {
            const effectiveOrgId = propOrgId || ctxOrgId || stateOrgId;
            const reason = (!effectiveOrgId) ? 'no-orgId' : (!privacy && slots.length===0 ? 'no-slots' : 'ok');
            const items = (privacy ? 1 : 0) + slots.length;
            return `ack: ${reason} • org: ${effectiveOrgId || '—'} • items: ${items}`;
          })()}
        </div>
      )}
    </div>
  );
}
