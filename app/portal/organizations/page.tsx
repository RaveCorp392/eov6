"use client";

import { useCallback, useEffect, useState } from "react";
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

type PartialOrg = { id: string; texts?: { privacyStatement?: string } } & Record<string, any>;

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

type MemberRecord = {
  id: string;
  email?: string;
  role?: string;
};

export default function PortalOrganizationsPage() {
  const auth = getAuth();
  const db = getFirestore();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<PartialOrg | null>(null);
  const [acks, setAcks] = useState<AckTemplate[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [privacyDraft, setPrivacyDraft] = useState("");
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackTitle, setAckTitle] = useState("");
  const [ackBody, setAckBody] = useState("");

  const applyOrgId = useCallback(async () => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const qOrg = url.searchParams.get("org");
    if (qOrg) {
      setOrgId(qOrg);
      try {
        localStorage.setItem("activeOrgId", qOrg);
      } catch {
        // ignore storage issues
      }
      return;
    }

    let pref: string | null = null;
    try {
      pref = localStorage.getItem("activeOrgId");
    } catch {
      // ignore storage issues
    }
    if (pref) {
      setOrgId(pref);
      return;
    }

    const email = auth.currentUser?.email?.toLowerCase() || "";
    if (!email) return;
    const entitlement = await getDoc(doc(db, "entitlements", email));
    const mapped = entitlement.exists() ? ((entitlement.data() as any)?.orgId || null) : null;
    setOrgId(mapped);
    if (mapped) {
      try {
        localStorage.setItem("activeOrgId", mapped);
      } catch {
        // ignore storage issues
      }
    }
  }, [auth, db]);

  const reloadOrg = useCallback(
    async (id: string) => {
      const snap = await getDoc(doc(db, "orgs", id));
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as any) } as PartialOrg;
        setOrg(data);
        setPrivacyDraft(String(data?.texts?.privacyStatement || ""));
      } else {
        setOrg(null);
        setPrivacyDraft("");
      }
    },
    [db]
  );

  const reloadAcks = useCallback(
    async (id: string) => {
      const snap = await getDocs(collection(db, "orgs", id, "ackTemplates"));
      const rows = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
      setAcks(rows);
    },
    [db]
  );

  const reloadInvites = useCallback(
    async (id: string) => {
      const snap = await getDocs(collection(db, "orgs", id, "invites"));
      setInvites(snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })));
    },
    [db]
  );

  const reloadMembers = useCallback(
    async (id: string) => {
      const snap = await getDocs(collection(db, "orgs", id, "members"));
      setMembers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })));
    },
    [db]
  );

  useEffect(() => {
    void applyOrgId();
    const unsubscribe = auth.onAuthStateChanged(() => {
      void applyOrgId();
    });
    return () => unsubscribe();
  }, [auth, applyOrgId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!orgId) {
        if (!cancelled) {
          setOrg(null);
          setAcks([]);
          setInvites([]);
          setMembers([]);
          setPrivacyDraft("");
        }
        return;
      }

      setLoading(true);
      try {
        await Promise.all([
          reloadOrg(orgId),
          reloadAcks(orgId),
          reloadInvites(orgId),
          reloadMembers(orgId),
        ]);
      } catch (err) {
        console.error("[portal/org] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, reloadOrg, reloadAcks, reloadInvites, reloadMembers]);

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
      setOrg((prev: PartialOrg | null) => (prev ? { ...prev, texts: nextTexts } : { id: orgId, texts: nextTexts }));
    } catch (err) {
      console.error("[portal/org] save privacy failed", err);
      alert("Could not save the privacy statement. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAck(id: string) {
    if (!orgId || !id) return;
    try {
      await deleteDoc(doc(db, "orgs", orgId, "ackTemplates", id));
      await reloadAcks(orgId);
    } catch (err) {
      console.error("[portal/org] delete ack failed", err);
      alert("Delete failed. Please try again.");
    }
  }

  async function handleCreateAck() {
    if (!orgId) return;
    const title = ackTitle.trim();
    const body = ackBody.trim();
    if (!title || !body) {
      alert("Please provide both a title and body.");
      return;
    }
    try {
      await addDoc(collection(db, "orgs", orgId, "ackTemplates"), {
        title,
        body,
        required: false,
        order: acks.length + 1,
        createdAt: Date.now(),
      });
      await reloadAcks(orgId);
      setShowAckModal(false);
      setAckTitle("");
      setAckBody("");
    } catch (err) {
      console.error("[portal/org] add ack failed", err);
      alert("Could not add acknowledgement. Please retry.");
    }
  }

  async function sendInvites() {
    if (!orgId) return;
    const emails = inviteInput
      .split(/[\s,;]+/)
      .map((email) => email.toLowerCase().trim())
      .filter(Boolean);
    if (emails.length === 0) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/orgs/invite/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, emails }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        // ignore parse failure
      }

      if (!response.ok || !payload?.ok) {
        const msg = payload?.error || response.statusText || "Invite send failed. Please retry.";
        alert(msg);
        return;
      }

      setInviteInput("");
      await reloadInvites(orgId);
      const count = typeof payload?.invited === "number" ? payload.invited : emails.length;
      alert(`Invited ${count} recipient(s).`);
    } catch (err) {
      console.error("[portal/org] send invites failed", err);
      alert("Invite send failed. Please retry.");
    }
  }

  async function revokeInvite(id: string) {
    if (!orgId || !id) return;
    if (!confirm("Revoke this invite?")) return;
    try {
      await deleteDoc(doc(db, "orgs", orgId, "invites", id));
      await reloadInvites(orgId);
    } catch (err) {
      console.error("[portal/org] revoke invite failed", err);
      alert("Could not revoke invite. Please try again.");
    }
  }

  async function removeMember(uid: string) {
    if (!orgId || !uid) return;
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await deleteDoc(doc(db, "orgs", orgId, "members", uid));
      await reloadMembers(orgId);
    } catch (err) {
      console.error("[portal/org] remove member failed", err);
      alert("Could not remove member. Please try again.");
    }
  }

  const manualOrgSetter = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOrgId(trimmed);
    try {
      localStorage.setItem("activeOrgId", trimmed);
    } catch {
      // ignore storage issues
    }
  };

  if (!orgId) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold mb-3">Organization</h1>
        <p className="text-sm text-zinc-600">
          We couldn&apos;t find your org automatically. Paste an org ID to continue.
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
              const value = prompt("Enter orgId")?.trim();
              if (value) manualOrgSetter(value);
            }}
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  const renderAckBody = (body: string | undefined) => {
    const text = body || "";
    if (text.length <= 240) return text;
    return `${text.slice(0, 240)}…`;
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-3">Organization - {org?.name || orgId}</h1>

      <div className="text-sm text-zinc-500 mb-4">{loading ? "Loading details..." : null}</div>

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
                <div className="font-medium">{ack.title || ack.id}</div>
                <div className="text-sm text-zinc-600 whitespace-pre-wrap">
                  {renderAckBody(ack.body)}
                </div>
              </div>
              <button className="button-ghost text-sm" onClick={() => deleteAck(ack.id)}>
                Delete
              </button>
            </div>
          ))}
          <button
            className="button-primary w-fit"
            onClick={() => {
              setAckTitle("");
              setAckBody("");
              setShowAckModal(true);
            }}
          >
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
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-2">Members</h2>
        {members.length === 0 && <div className="text-sm text-zinc-500">No members yet.</div>}
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between py-1">
            <div className="text-sm">
              <div className="font-medium">{member.email || member.id}</div>
              <div className="text-zinc-500">Role: {member.role || "viewer"}</div>
            </div>
            <button className="button-ghost text-sm" onClick={() => removeMember(member.id)}>
              Remove
            </button>
          </div>
        ))}
        <div className="text-xs text-zinc-500 mt-2">
          Note: removing yourself requires another owner to re-add you.
        </div>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold mb-2">Pending invites</h2>
        {invites.length === 0 && <div className="text-sm text-zinc-500">No invites yet.</div>}
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between py-1">
            <div className="text-sm">
              <div className="font-medium">{invite.email || invite.id}</div>
              <div className="text-zinc-500">Status: {invite.status || "pending"}</div>
            </div>
            <button className="button-ghost text-sm" onClick={() => revokeInvite(invite.id)}>
              Revoke
            </button>
          </div>
        ))}
        <div className="text-xs text-zinc-500 mt-2">
          If an invite is accepted, it moves to Members automatically.
        </div>
      </div>

      {showAckModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border p-4 w-[min(640px,90vw)]">
            <h3 className="font-semibold mb-2">New acknowledgement</h3>
            <div className="mb-2">
              <label className="text-xs text-zinc-600 block mb-1">Title</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={ackTitle}
                onChange={(e) => setAckTitle(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="text-xs text-zinc-600 block mb-1">Body</label>
              <textarea
                className="w-full rounded border px-3 py-2 min-h-[140px] resize-y"
                value={ackBody}
                onChange={(e) => setAckBody(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="button-primary" onClick={handleCreateAck}>
                Save
              </button>
              <button
                className="button-ghost"
                onClick={() => {
                  setShowAckModal(false);
                  setAckTitle("");
                  setAckBody("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
