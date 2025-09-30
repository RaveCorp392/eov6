"use client";

import { useState } from "react";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { OrgDoc } from "@/lib/org-types";

type Props = {
  orgId: string;
  org: Partial<OrgDoc>;
  onSaved: (next: Partial<OrgDoc>) => void;
  canManage?: boolean;
};

export default function OrgBilling({ orgId, org, onSaved, canManage = true }: Props) {
  const db = getFirestore();
  const [plan, setPlan] = useState(org.billing?.plan ?? "starter");
  const [customerId, setCustomerId] = useState(org.billing?.stripeCustomerId ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const next = { billing: { plan, stripeCustomerId: customerId.trim() } };
    await setDoc(doc(db, "orgs", orgId), next, { merge: true });
    onSaved({ ...org, ...next });
    setBusy(false);
  }

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "No portal URL returned. Ensure STRIPE_SECRET_KEY and stripeCustomerId are set.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Plan</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="border rounded px-3 py-2 bg-white dark:bg-slate-900"
            disabled={!canManage}
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Stripe customer ID</span>
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="border rounded px-3 py-2 bg-white dark:bg-slate-900"
            placeholder="cus_XXXXXXXXXXXX"
            disabled={!canManage}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy || !canManage}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save billing"}
        </button>
        <button
          onClick={openPortal}
          disabled={busy || !customerId || !canManage}
          className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-50"
        >
          Open Billing Portal
        </button>
      </div>
      <p className="text-xs text-slate-500">
        The Billing Portal lets admins update payment methods, view invoices, and manage subscriptions. Requires
        <code> STRIPE_SECRET_KEY</code> and an existing <code>stripeCustomerId</code> on the org.
      </p>
    </div>
  );
}

