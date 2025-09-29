"use client";
import { useEffect, useMemo, useState } from "react";
import "@/lib/firebase";
import { getAuth } from "firebase/auth";

type Summary = { plan?: string; cycle?: string; seats?: number; translate?: boolean };

export default function OnboardPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({});
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [orgSlug, setOrgSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [domainsCsv, setDomainsCsv] = useState("");
  const [allowUploads, setAllowUploads] = useState(false);
  const [translateUnlimited, setTranslateUnlimited] = useState(false);
  const [privacy, setPrivacy] = useState("");
  const [ack1t, setAck1t] = useState("");
  const [ack1b, setAck1b] = useState("");
  const [ack1r, setAck1r] = useState(false);
  const [ack2t, setAck2t] = useState("");
  const [ack2b, setAck2b] = useState("");
  const [ack2r, setAck2r] = useState(false);
  const [invites, setInvites] = useState<string>("");

  const seats = summary.seats ?? 1;
  const translateLocked = !!summary.translate; // purchased add-on ? lock on

  // 0) Load checkout metadata + discover org
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session_id");
    (async () => {
      try {
        if (sid) {
          const s: Summary | null = await fetch(`/api/checkout/summary?session_id=${encodeURIComponent(sid)}`).then((r) =>
            r.ok ? r.json() : null
          );
          if (s) {
            setSummary(s);
            if (s.translate) setTranslateUnlimited(true);
          }
        }
        const t = await getAuth().currentUser?.getIdToken();
        if (!t) return;
        const me = await fetch("/api/me/org", { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json());
        if (me?.orgId) {
          setOrgId(me.orgId);
          setStep(2);
        } // org exists ? jump to invites
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  const perSeatNote = useMemo(
    () => (translateLocked ? "(Translate Unlimited included by your plan)" : "(Optional; can be changed later)"),
    [translateLocked]
  );

  async function next() {
    setErr(null);
    try {
      setBusy(true);
      const t = await getAuth().currentUser?.getIdToken();
      if (!t) {
        alert("Please sign in first.");
        setBusy(false);
        return;
      }

      if (step === 1) {
        // Create org (server route) + claim owner
        const res = await fetch("/api/portal/orgs/create", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
          body: JSON.stringify({
            orgId: orgSlug,
            name: orgName,
            ownerEmail,
            domains: domainsCsv.split(",").map((s) => s.trim()).filter(Boolean),
            features: { allowUploads, translateUnlimited: translateLocked ? true : translateUnlimited },
            privacyStatement: privacy,
            ack1: { title: ack1t, body: ack1b, required: !!ack1r },
            ack2: { title: ack2t, body: ack2b, required: !!ack2r }
          })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || res.statusText);
        }
        const j = await res.json();
        setOrgId(j.orgId);

        // idempotent claim
        await fetch("/api/orgs/claim", { method: "POST", headers: { authorization: `Bearer ${t}` } });

        setStep(2);
      } else if (step === 2) {
        // Store invites (no email send yet). Accepts comma/space newline separated emails.
        const emails = invites
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (emails.length) {
          const r = await fetch("/api/orgs/invite/bulk", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
            body: JSON.stringify({ orgId, emails })
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j?.error || r.statusText);
          }
        }
        setStep(3);
      } else {
        // Save Compliance/settings updates
        const r = await fetch("/api/orgs/settings", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
          body: JSON.stringify({
            orgId,
            features: { allowUploads, translateUnlimited: translateLocked ? true : translateUnlimited },
            texts: { privacyStatement: privacy },
            ack: [
              { id: "slot1", title: ack1t, body: ack1b, required: !!ack1r, order: 1 },
              { id: "slot2", title: ack2t, body: ack2b, required: !!ack2r, order: 2 }
            ]
          })
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || r.statusText);
        }
        window.location.href = "/thanks/setup";
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function canNext() {
    if (step === 1) return orgSlug && orgName && ownerEmail;
    if (step === 2) return true; // invites optional
    return true;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">{"Welcome \u2014 Let\u2019s get you set up"}</h1>
      <p className="text-zinc-600 mb-6">{"3 quick steps. You\u2019ll be up and running in minutes."}</p>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`px-2 py-1 rounded ${step === n ? "bg-zinc-900 text-white" : "border"}`}
          >
            Step {n}
          </span>
        ))}
      </div>

      {err && <div className="mb-4 rounded bg-rose-100 text-rose-900 p-3">{err}</div>}

      {step === 1 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">1) Create your organization</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Org ID (slug)</label>
              <input className="w-full rounded border px-3 py-2" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input className="w-full rounded border px-3 py-2" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Owner email</label>
              <input className="w-full rounded border px-3 py-2" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Domains (csv)</label>
              <input className="w-full rounded border px-3 py-2" value={domainsCsv} onChange={(e) => setDomainsCsv(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allowUploads} onChange={(e) => setAllowUploads(e.target.checked)} /> Allow Uploads
            </label>
            <label className={`flex items-center gap-2 ${translateLocked ? "opacity-60 pointer-events-none" : ""}`}>
              <input
                type="checkbox"
                checked={translateUnlimited}
                onChange={(e) => setTranslateUnlimited(e.target.checked)}
                disabled={translateLocked}
              />
              <span>Translate Unlimited {perSeatNote}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium">Privacy Statement</label>
            <textarea className="w-full rounded border px-3 py-2" rows={6} value={privacy} onChange={(e) => setPrivacy(e.target.value)} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Slot 1 Title</label>
              <input className="w-full rounded border px-3 py-2" value={ack1t} onChange={(e) => setAck1t(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Slot 2 Title</label>
              <input className="w-full rounded border px-3 py-2" value={ack2t} onChange={(e) => setAck2t(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Slot 1 Body</label>
              <textarea className="w-full rounded border px-3 py-2" rows={4} value={ack1b} onChange={(e) => setAck1b(e.target.value)} />
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={ack1r} onChange={(e) => setAck1r(e.target.checked)} /> Required
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Slot 2 Body</label>
              <textarea className="w-full rounded border px-3 py-2" rows={4} value={ack2b} onChange={(e) => setAck2b(e.target.value)} />
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={ack2r} onChange={(e) => setAck2r(e.target.checked)} /> Required
              </label>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">2) Invite your team</h2>
          <p className="text-zinc-600 text-sm">
            Paste emails (comma, space, or new line separated). Seats purchased: <b>{seats}</b> (owner counts as one).
          </p>
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={6}
            value={invites}
            onChange={(e) => setInvites(e.target.value)}
            placeholder="alex@company.com, taylor@company.com..."
          />
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">3) Finalize settings</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allowUploads} onChange={(e) => setAllowUploads(e.target.checked)} /> Allow Uploads
            </label>
            <label className={`flex items-center gap-2 ${translateLocked ? "opacity-60 pointer-events-none" : ""}`}>
              <input
                type="checkbox"
                checked={translateUnlimited}
                onChange={(e) => setTranslateUnlimited(e.target.checked)}
                disabled={translateLocked}
              />
              <span>Translate Unlimited {perSeatNote}</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">Privacy Statement</label>
            <textarea className="w-full rounded border px-3 py-2" rows={6} value={privacy} onChange={(e) => setPrivacy(e.target.value)} />
          </div>
          <p className="text-zinc-600 text-sm">You can update any of this later in Portal.</p>
        </section>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button
          disabled={step === 1 || busy}
          className="rounded-xl border px-4 py-2"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
        >
          Back
        </button>
        <button
          disabled={!canNext() || busy}
          className="rounded-xl bg-blue-600 text-white px-4 py-2"
          onClick={next}
        >
          {busy ? "Working�" : step < 3 ? "Next" : "Finish"}
        </button>
      </div>
    </main>
  );
}




