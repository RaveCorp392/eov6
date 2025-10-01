"use client";

import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function AgentConsole() {
  const auth = getAuth();
  const db = getFirestore();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("-");
  const [draftOrgId, setDraftOrgId] = useState<string>("");

  // Load entitlement -> activeOrgId (only once)
  useEffect(() => {
    (async () => {
      const email = auth.currentUser?.email?.toLowerCase() || "";
      if (!email) return;

      const pref = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null;
      if (pref) {
        setActiveOrgId(pref);
        return;
      }

      const ent = await getDoc(doc(db, "entitlements", email));
      const mapped = ent.exists() ? ((ent.data() as any)?.orgId || null) : null;
      setActiveOrgId(mapped);
      if (mapped) localStorage.setItem("activeOrgId", mapped);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep draft input in sync with active selection
  useEffect(() => {
    setDraftOrgId(activeOrgId || "");
  }, [activeOrgId]);

  // Load org name when activeOrgId changes
  useEffect(() => {
    (async () => {
      if (!activeOrgId) {
        setOrgName("-");
        return;
      }
      const s = await getDoc(doc(db, "orgs", activeOrgId));
      setOrgName(s.exists() ? ((s.data() as any)?.name || activeOrgId) : activeOrgId);
    })();
  }, [activeOrgId, db]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[agent] entitlement activeOrgId:", activeOrgId);
    }
  }, [activeOrgId]);

  async function startNewSession() {
    const token = await auth.currentUser?.getIdToken();
    const r = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ activeOrgId }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.error || "create_failed");
      return;
    }
    window.location.href = `/agent/s/${j.code}`;
  }

  function handleOrgCommit(nextId: string) {
    const trimmed = nextId.trim();
    setActiveOrgId(trimmed || null);
    if (trimmed) localStorage.setItem("activeOrgId", trimmed);
    else localStorage.removeItem("activeOrgId");
  }

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="text-xs text-zinc-500 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-zinc-100 border">
          Org: <b>{orgName}</b>
        </span>
      </div>
      <button className="button-primary" onClick={startNewSession}>
        Start a new session
      </button>

      <div className="mt-3 flex items-center gap-2">
        <input
          className="rounded border px-2 py-1 text-sm"
          placeholder="Set active orgId"
          value={draftOrgId}
          onChange={(e) => setDraftOrgId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleOrgCommit((e.target as HTMLInputElement).value);
          }}
        />
        <button
          className="button-ghost text-sm"
          onClick={() => {
            setDraftOrgId("");
            handleOrgCommit("");
          }}
        >
          Clear
        </button>
        <button
          className="button-ghost text-sm"
          onClick={() => handleOrgCommit(draftOrgId)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
