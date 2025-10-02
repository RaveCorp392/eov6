"use client";

import { useEffect, useRef, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

type AckTemplate = {
  id: string;
  title?: string;
  body?: string;
  required?: boolean;
  order?: number;
};

type InviteRecord = {
  id: string;
  email?: string;
  status?: string;
};

export default function PortalOrganizationsPage() {
  const auth = getAuth();
  const db = getFirestore();

  const [orgId, setOrgId] = useState<string | null>(null);
  const orgIdRef = useRef<string | null>(null);
  const [org, setOrg] = useState<any | null>(null);
  const [acks, setAcks] = useState<AckTemplate[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [privacyDraft, setPrivacyDraft] = useState("");

  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  const persistActiveOrg = (value: string | null) => {
    if (typeof window === "undefined") return;
    try {
      if (value) {
        localStorage.setItem("activeOrgId", value);
      } else {
        localStorage.removeItem("activeOrgId");
      }
    } catch {
      // ignore storage issues
    }
  };

  const applyOrgId = (value: string | null, force = false) => {
    const trimmed = value?.trim();
    if (!trimmed) return false;
    if (!force && orgIdRef.current) return false;
    orgIdRef.current = trimmed;
    setOrgId(trimmed);
    persistActiveOrg(trimmed);
    return true;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const fetchOrgForEmail = async (email: string | null | undefined) => {
      const normalized = email?.trim().toLowerCase();
      if (!normalized || cancelled || orgIdRef.current) return;
      try {
        const entSnap = await getDoc(doc(db, "entitlements", normalized));
        if (!entSnap.exists()) return;
        const mapped = (entSnap.data() as any)?.orgId;
        if (mapped && !cancelled) {
          applyOrgId(String(mapped));
        }
      } catch (err) {
        console.error("[portal/org] entitlement lookup failed", err);
      }
    };

    const bootstrap = async () => {
      if (cancelled) return;
      const current = new URL(window.location.href);
      const qOrg = current.searchParams.get("org");
      if (qOrg) {
        applyOrgId(qOrg, true);
        return;
      }

      try {
        const stored = localStorage.getItem("activeOrgId");
        if (stored) {
          applyOrgId(stored, true);
          return;
        }
      } catch {
        // ignore storage read issues
      }

      await fetchOrgForEmail(auth.currentUser?.email);
    };

    bootstrap();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (cancelled || orgIdRef.current) return;
      fetchOrgForEmail(user?.email);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth, db]);

  async function readAckTemplates(id: string) {
    const snap = await getDocs(collection(db, "orgs", id, "ackTemplates"));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  }

  async function readInvites(id: string) {
    const snap = await getDocs(collection(db, "orgs", id, "invites"));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  useEffect(() => {
    let cancelled = false;

    if (!orgId) {
      setOrg(null);
      setAcks([]);
      setInvites([]);
      setPrivacyDraft("");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const orgRef = doc(db, "orgs", orgId);
        const snap = await getDoc(orgRef);
        const orgData = snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null;
        if (!cancelled) {
          setOrg(orgData);
          setPrivacyDraft(String(orgData?.texts?.privacyStatement || ""));
        }
        const [ackList, inviteList] = await Promise.all([
          readAckTemplates(orgId),
          readInvites(orgId),
        ]);
        if (!cancelled) {
          setAcks(ackList);
          setInvites(inviteList);
        }
      } catch (err) {
        console.error("[portal/org] load failed", err);
        if (!cancelled) {
          setOrg(null);
          setAcks([]);
          setInvites([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [orgId, db]);

  async function savePrivacy(nextText: string) {
    if (!orgId) return;
    const normalized = nextText;
    if ((org?.texts?.privacyStatement || "") === normalized) return;
    setSaving(true);
    try {
      const nextTexts = { ...(org?.texts || {}), privacyStatement: normalized };
      await setDoc(
        doc(db, "orgs", orgId),
        { texts: nextTexts, updatedAt: Date.now() },
        { merge: true }
      );
      setOrg((prev) => (prev ? { ...prev, texts: nextTexts } : { id: orgId, texts: nextTexts }));
    } catch (err) {
      console.error("[portal/org] save privacy failed", err);
      alert("Could not save the privacy statement. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function addAck() {
    if (!orgId) return;
    const title = (prompt("Ack title?") || "").trim();
    const body = (prompt("Ack body?") || "").trim();
    if (!title || !body) return;
    try {
      const nextOrder = acks.reduce((max, item) => Math.max(max, Number(item.order || 0)), 0) + 1;
      await addDoc(collection(db, "orgs", orgId, "ackTemplates"), {
        title,
        body,
        required: false,
        order: nextOrder,
        createdAt: Date.now(),
      });
      setAcks(await readAckTemplates(orgId));
    } catch (err) {
      console.error("[portal/org] add ack failed", err);
      alert("Could not add acknowledgement. Please retry.");
    }
  }

  async function deleteAck(id: string) {
    if (!orgId || !id) return;
    try {
      await deleteDoc(doc(db, "orgs", orgId, "ackTemplates", id));
      setAcks((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("[portal/org] delete ack failed", err);
      alert("Delete failed. Please try again.");
    }
  }

  async function sendInvites() {
    if (!orgId) return;
    const emails = inviteInput
      .split(/[\s,;]+/)
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);
    if (emails.length === 0) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Please sign in to send invites.");
        return;
      }
      const response = await fetch("/api/orgs/invite/bulk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orgId, emails }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(payload?.error || "invite_failed");
        return;
      }
      setInviteInput("");
      setInvites(await readInvites(orgId));
      const invitedCount = typeof payload?.invited === "number" ? payload.invited : emails.length;
      alert(`Invited ${invitedCount} recipient${invitedCount === 1 ? "" : "s"}.`);
    } catch (err) {
      console.error("[portal/org] send invites failed", err);
      alert("Invite send failed. Please retry.");
    }
  }

  const manualOrgSetter = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    applyOrgId(trimmed, true);
  };

  if (!orgId) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold mb-3">Organization</h1>
        <p className="text-sm text-zinc-600">
          We couldn't find your org automatically. Paste an org ID to continue.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="orgId"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                manualOrgSetter((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            className="button-ghost text-sm"
            onClick={() => {
              const v = prompt("Enter orgId")?.trim();
              if (v) manualOrgSetter(v);
            }}
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Organization - {org?.name || orgId}</h1>

      <div className="text-sm text-zinc-500 mb-4">
        {loading ? "Loading details..." : null}
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-2">Privacy statement</h2>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={6}
          value={privacyDraft}
          onChange={(e) => setPrivacyDraft(e.target.value)}
          onBlur={(e) => savePrivacy(e.target.value)}
          disabled={saving}
        />
        {saving && <div className="mt-2 text-xs text-zinc-500">Saving...</div>}
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-2">Acknowledgements</h2>
        <div className="flex flex-col gap-2">
          {acks.length === 0 && <div className="text-sm text-zinc-500">No templates yet.</div>}
          {acks.map((ack) => (
            <div key={ack.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{ack.title || ack.id}</div>
                <div className="text-sm text-zinc-600 truncate">{ack.body}</div>
              </div>
              <button className="button-ghost text-sm" onClick={() => deleteAck(ack.id)}>
                Delete
              </button>
            </div>
          ))}
          <button className="button-primary w-fit" onClick={addAck}>
            Add template
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-2">Invite teammates</h2>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={3}
          placeholder="alice@acme.com, bob@acme.com"
          value={inviteInput}
          onChange={(e) => setInviteInput(e.target.value)}
        />
        <div className="mt-2">
          <button className="button-primary" onClick={sendInvites}>
            Send invites
          </button>
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-1">Pending</h3>
          {invites.length === 0 && <div className="text-sm text-zinc-500">No invites yet.</div>}
          {invites.map((invite) => (
            <div key={invite.id} className="text-sm">
              {invite.email || invite.id} - {invite.status || "pending"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}










