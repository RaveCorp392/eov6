"use client";

import { useEffect, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import AgentLandingInfo from "@/components/AgentLandingInfo";

export default function AgentConsole() {
  const auth = getAuth();
  const db = getFirestore();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("-");

  useEffect(() => {
    (async () => {
      const email = auth.currentUser?.email?.toLowerCase() || "";
      if (!email) return;
      const pref = localStorage.getItem("activeOrgId");
      if (pref) {
        setActiveOrgId(pref);
        return;
      }
      const ent = await getDoc(doc(db, "entitlements", email));
      const mapped = ent.exists ? ((ent.data() as any)?.orgId || null) : null;
      setActiveOrgId(mapped);
      if (mapped) localStorage.setItem("activeOrgId", mapped);
    })();
  }, [auth, db]);

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

  async function startNewSession() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("create_failed");
        return;
      }
      const r = await fetch("/api/sessions/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + token,
        },
        body: JSON.stringify({ activeOrgId }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j?.error || "create_failed");
        return;
      }
      window.location.href = "/agent/s/" + j.code;
    } catch (err: any) {
      alert(err?.message || "create_failed");
    }
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
          defaultValue={activeOrgId || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const id = (e.target as HTMLInputElement).value.trim();
              if (id) {
                setActiveOrgId(id);
                localStorage.setItem("activeOrgId", id);
              }
            }
          }}
        />
        <button
          className="button-ghost text-sm"
          onClick={() => {
            setActiveOrgId(null);
            localStorage.removeItem("activeOrgId");
          }}
        >
          Clear
        </button>
      </div>

      <div className="mt-6">
        <AgentLandingInfo />
      </div>
    </div>
  );
}
