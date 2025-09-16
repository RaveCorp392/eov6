"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db, onAuthStateChanged } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type EntitlementsDoc = {
  addons?: { translateUnlimited?: boolean };
  orgId?: string;
  orgName?: string;
  plan?: string;
};

export default function AgentLandingInfo() {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [ent, setEnt] = useState<EntitlementsDoc | null>(null);
  const hasUnlimited = !!ent?.addons?.translateUnlimited || ent?.plan === "translate-unlimited";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setEmail(u?.email || null);
      setDisplayName(u?.displayName || null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!email) return;
    const entRef = doc(db, "entitlements", email.toLowerCase());
    const unsub = onSnapshot(entRef, (snap) => {
      setEnt((snap.exists() ? (snap.data() as EntitlementsDoc) : null) || null);
    });
    return () => unsub();
  }, [email]);

  const orgName = ent?.orgName || "—";

  return (
    <div className="mt-6 grid gap-6">
      {/* Who am I / where am I */}
      <section className="rounded-xl border p-4 bg-white/80">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
          <div><span className="opacity-60 mr-1">Signed in as:</span>{displayName ? `${displayName} (${email})` : (email || "—")}</div>
          <div><span className="opacity-60 mr-1">Organization:</span>{orgName}</div>
          <div><span className="opacity-60 mr-1">Translate Unlimited:</span>{hasUnlimited ? "Enabled" : "Not included"}</div>
          <div><span className="opacity-60 mr-1">Plan:</span>{ent?.plan || "—"}</div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Tip: Unlimited is also available org-wide. If your org enables it, per-message metering is skipped automatically.
        </p>
      </section>

      {/* Quick start / instructions */}
      <section className="rounded-xl border p-4 bg-white/80">
        <h2 className="text-lg font-semibold">How to run a session</h2>
        <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm">
          <li><strong>Start a new session.</strong> Click “Start a new session” above — you’ll get a 6-digit code.</li>
          <li><strong>Share the code with the caller.</strong> They go to <code>/s/&lt;code&gt;</code> and join.</li>
          <li><strong>Send acknowledgement.</strong> On the agent session page, click <em>Send acknowledgement</em>. The caller sees a modal, types their name (if required), and accepts. A system line will log the acceptance.</li>
          <li><strong>Caller details.</strong> Caller can enter name, email, phone. You’ll see updates in your panel immediately.</li>
          <li><strong>File uploads.</strong> Caller can upload images/PDFs. They appear as clickable links in chat.</li>
          <li><strong>Live Translate (bi-directional).</strong> Toggle it on, pick <em>Agent</em> and <em>Caller</em> languages. You’ll see your messages in your language; they’ll see them in theirs. Use the <em>Preview</em> box for up to 5 free previews per session, then “Send to chat” (or “Send to chat &amp; bill” if your plan doesn’t include Unlimited).</li>
          <li><strong>End session.</strong> Use <em>End session &amp; delete data</em> when you’re done. This clears chat and uploads for privacy.</li>
        </ol>
        <div className="mt-3 text-sm">
          Prefer a full walkthrough? <a className="underline" href="/how-it-works" target="_blank" rel="noopener noreferrer">See the step-by-step guide</a>.
        </div>
      </section>

      {/* Light usage nudge (non-blocking, no risky queries) */}
      <section className="rounded-xl border p-4 bg-white/80">
        <h2 className="text-lg font-semibold">Team usage (light)</h2>
        <p className="mt-2 text-sm text-slate-700">
          Encourage consistent use: ask callers to share files early, confirm details before proceeding, and enable Live Translate as soon as a language barrier appears.
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>Use <em>Preview</em> to sanity-check tricky phrases (you get 5 per session).</li>
          <li>When Unlimited is off, the button switches to <em>Send to chat &amp; bill</em> and metering records the event.</li>
          <li>End sessions to keep your queue clean and data footprint minimal.</li>
        </ul>
      </section>
    </div>
  );
}
