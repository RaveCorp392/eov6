EOV6 — Org-level Uploads (feature flag)

Goal: Allow file uploads (images/PDFs) only for organizations that enable them. Uploads must be secure for anonymous callers, ephemeral by policy, and simple for agents.

1) Data model
1.1 orgs/{orgId} (Firestore)
{
  "name": "Sample Support",
  "domains": ["ssq.com"],                  // map agent email domains → org
  "admins": ["owner@ssq.com"],             // who can flip switches
  "features": {
    "allowUploads": true                   // org-level “tickable” feature
  }
}

1.2 sessions/{code} (Firestore) — additions
{
  "orgId": "ssq",                          // who owns this session
  "featuresSnapshot": {
    "allowUploads": true                   // copied from org at session start
  },
  "uploadSecret": "uWb8P4...32+ chars",    // per-session secret for Storage rules
  "closed": false
}


We snapshot the org’s features into the session so the behavior is stable for the duration of the call even if someone flips a switch mid-session.

2) Security rules
2.1 Firebase Storage rules (paste in Storage rules)

Enforces the org toggle and a per-session secret so a 6-digit code alone can’t be abused.

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function orgDoc(orgId) {
      return firestore.get(/databases/(default)/documents/orgs/$(orgId)).data;
    }
    function sessionDoc(code) {
      return firestore.get(/databases/(default)/documents/sessions/$(code)).data;
    }

    // Optional: basic constraints
    function allowedContent() {
      // allow PNG/JPEG/PDF (tweak as needed)
      return request.resource.contentType.matches('image/.+') ||
             request.resource.contentType == 'application/pdf';
    }
    function allowedSize() {
      // <= 10 MB
      return request.resource.size <= 10 * 1024 * 1024;
    }

    // Upload path: orgs/{orgId}/sessions/{code}/uploads/{uuid}
    match /orgs/{orgId}/sessions/{code}/uploads/{fileId} {

      // Anonymous callers may write, but only with valid secret and when feature is on.
      allow write: if
        orgDoc(orgId).features.allowUploads == true &&
        sessionDoc(code).closed != true &&
        allowedContent() && allowedSize() &&
        request.resource != null &&
        // customMetadata['sessionSecret'] must match the session’s uploadSecret
        request.resource.metadata.sessionSecret == sessionDoc(code).uploadSecret;

      // Reads: keep open for demo, or restrict to agent domains
      allow read: if
        orgDoc(orgId).features.allowUploads == true;
        // To restrict: request.auth.token.email.matches('.*@(ssq\\.com|yourdomain\\.com)$')
    }
  }
}

2.2 Firestore rules — org admin writes

Add/merge with your existing rules to restrict who can edit org features.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /orgs/{orgId} {
      allow read: if true; // or signed-in agents only

      // Only allow listed admins to edit org and its features
      allow write: if request.auth != null &&
                   orgId in request.resource.id &&            // no-op guard for clarity
                   request.auth.token.email in resource.data.admins;
    }

    // sessions rules remain as in current app…
  }
}

3) Session creation (agent side)

When an agent starts a session we:

Derive orgId from the agent’s email domain (or fall back to a default org).

Read orgs/{orgId}.features.allowUploads.

Generate a cryptographically strong uploadSecret (32+ random chars).

Create the session with orgId, featuresSnapshot.allowUploads, and uploadSecret.

Patch: app/agent/page.tsx (where you create sessions)

import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function deriveOrgIdFromEmail(email?: string | null): string {
  if (!email) return "default";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  // Simple mapping: first matching org that lists the domain
  // (For now, one org; scale later.)
  if (domain.endsWith("ssq.com")) return "ssq";
  return "default";
}

function randomSecret(len = 40) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let s = "";
  const cryptoObj = typeof crypto !== "undefined" ? crypto : null;
  if (cryptoObj && "getRandomValues" in cryptoObj) {
    const arr = new Uint8Array(len);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
    return s;
  }
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function createNewSession(email: string, code: string) {
  const orgId = deriveOrgIdFromEmail(email);
  const orgRef = doc(db, "orgs", orgId);
  const orgSnap = await getDoc(orgRef);
  const allowUploads = Boolean(orgSnap.data()?.features?.allowUploads);

  const uploadSecret = randomSecret(48);

  const sessRef = doc(db, "sessions", code);
  await setDoc(sessRef, {
    orgId,
    featuresSnapshot: { allowUploads },
    uploadSecret,
    closed: false,
    createdAt: (await import("firebase/firestore")).serverTimestamp()
  }, { merge: true });

  return { orgId, allowUploads, uploadSecret };
}


Use createNewSession() inside your NewSessionButton handler where you already create the session.

4) Client UI gating
4.1 Show upload only if allowed

Read featuresSnapshot.allowUploads from the session header (you’re already subscribing).

If true, render an UploadButton. If false, hide it.

// Example usage in caller and agent pages (inside your JSX toolbars)
{session?.featuresSnapshot?.allowUploads && (
  <UploadButton
    code={code}
    orgId={session.orgId}
    sessionSecret={session.uploadSecret}
    onUploaded={(name) => addDoc(msgsRef, {
      text: `Uploaded file: ${name}`,
      from: "caller",
      at: serverTimestamp()
    })}
  />
)}

5) Minimal UploadButton.tsx (drop in components/)

Requires storage exported from lib/firebase.ts.

"use client";

import { useRef, useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";

type Props = {
  code: string;
  orgId: string;
  sessionSecret: string;
  onUploaded?: (name: string) => void;
};

export default function UploadButton({ code, orgId, sessionSecret, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePick() {
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const name = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const path = `orgs/${orgId}/sessions/${code}/uploads/${name}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, {
        contentType: file.type || "application/octet-stream",
        customMetadata: { sessionSecret }
      });

      onUploaded?.(name);
    } finally {
      setBusy(false);
      // reset input for same-file re-uploads
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={handlePick}
        disabled={busy}
        className="rounded bg-indigo-600 text-white px-3 py-2 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Attach file"}
      </button>
    </>
  );
}

5.1 lib/firebase.ts — ensure storage is exported
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = { /* … existing … */ };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp }; // already in use

6) Seeding an org (one-off)

You can create the first org via the Firestore console:

Collection: orgs → Doc ID: ssq
Data:

{
  "name": "SSQ",
  "domains": ["ssq.com"],
  "admins": ["your.email@ssq.com"],
  "features": { "allowUploads": true }
}


(Repeat for default org with allowUploads: false if you want a fallback.)

7) TTL cleanup (ephemeral by policy)

Add a scheduled cleanup (Cloud Functions or any cron) to purge uploads after expiry:

Pseudo (Node):

import { getStorage } from "firebase-admin/storage";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export const purgeExpired = async () => {
  const db = getFirestore();
  const bucket = getStorage().bucket();

  const snap = await db.collection("sessions")
    .where("expiresAt", "<", Timestamp.now())
    .get();

  for (const doc of snap.docs) {
    const { orgId } = doc.data();
    const code = doc.id;
    const [files] = await bucket.getFiles({ prefix: `orgs/${orgId}/sessions/${code}/uploads/` });
    await Promise.all(files.map(f => f.delete()));
    // optionally delete the session doc or mark as archived
  }
};


If you prefer not to add Functions yet, you can run a small serverless cron from Vercel invoking an API route with Admin SDK credentials to do the same.

8) Roll-out checklist

 Export storage from lib/firebase.ts.

 Paste Storage rules (section 2.1).

 Add/merge Firestore org rules (section 2.2).

 Seed orgs/{orgId} with features.allowUploads.

 Patch session creation to write orgId, featuresSnapshot.allowUploads, uploadSecret.

 Drop in components/UploadButton.tsx and render it conditionally where featuresSnapshot.allowUploads is true.

 (Optional) Add admin UI to flip the feature (writes to orgs/{orgId}.features.allowUploads).

 Add TTL cleanup job.

9) Notes & guardrails

Anonymous caller security: Uploads require both the session code and the hidden uploadSecret stored in Firestore; the secret is transmitted only via client code and enforced by Storage rules.

Content limits: Rules currently allow image/* and application/pdf ≤ 10 MB; tweak as needed.

Privacy: Keep uploads in per-session subfolders and purge on TTL expiry.

Demo polish: In production, hide the “Open agent console” link on the caller page; leave it visible for demos if useful.

10) Near-term tickets

Auto-scroll chat (caller & agent): scroll to bottom on new messages unless the user is actively scrolling up.

Uploads feature flag UI: simple /agent/org page with a toggle for admins.

Export/purge UX: button for agents to export and then end session, confirming TTL deletion.