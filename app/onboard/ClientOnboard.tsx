"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugifyName } from "@/lib/slugify";

type Summary = { plan?: string; cycle?: string; seats?: number; translate?: boolean };

type AckTemplate = {
  id: string;
  title?: string;
  body?: string;
  text?: string;
  required?: boolean;
  order?: number;
  createdAt?: number;
};

export default function ClientOnboard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({});
  const [err, setErr] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const queryOrgSlug = searchParams?.get("org");

  // Form state
  const [allowUploads, setAllowUploads] = useState(false);
  const [translateUnlimited, setTranslateUnlimited] = useState(false);
  const [privacy, setPrivacy] = useState("");
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
        }
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    if (queryOrgSlug) {
      setOrgId((prev) => prev ?? queryOrgSlug);
    }
  }, [queryOrgSlug]);

  const perSeatNote = useMemo(
    () => (translateLocked ? "(Translate Unlimited included by your plan)" : "(Optional; can be changed later)"),
    [translateLocked]
  );

  async function next() {
    setErr(null);
    try {
      setBusy(true);
      let token: string | null = null;
      if (step === 2 || step === 3) {
        token = (await getAuth().currentUser?.getIdToken()) ?? null;
        if (!token) {
          alert("Please sign in first.");
          setBusy(false);
          return;
        }
      }

      if (step === 2) {
        if (!orgId) throw new Error("org_missing");
        const authToken = token!;
        // Store invites (no email send yet). Accepts comma/space newline separated emails.
        const emails = invites
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (emails.length) {
          const r = await fetch("/api/orgs/invite/bulk", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ orgId, emails })
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error(j?.error || r.statusText);
          }
        }
        setStep(3);
      } else if (step === 3) {
        if (!orgId) throw new Error("org_missing");
        const authToken = token!;
        // Save Compliance/settings updates
        const r = await fetch("/api/orgs/settings", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            orgId,
            features: { allowUploads, translateUnlimited: translateLocked ? true : translateUnlimited },
            texts: { privacyStatement: privacy }
          })
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || r.statusText);
        }
        setStep(4);
      } else if (step === 4) {
        setStep(5);
      } else if (step === 5) {
        if (!orgId) throw new Error("org_missing");
        window.location.href = `/thanks/setup?org=${encodeURIComponent(orgId || "")}`;
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function canNext() {
    if (step === 1) return false;
    if (step === 5 && !orgId) return false;
    return true;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">{"Welcome \u2014 Let\u2019s get you set up"}</h1>
      <p className="text-zinc-600 mb-6">{"5 quick steps. You\u2019ll be up and running in minutes."}</p>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        {[1, 2, 3, 4, 5].map((n) => (
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
        <CreateOrgStep
          onCreated={(slug) => {
            setOrgId(slug);
            setStep(2);
            setErr(null);
          }}
        />
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

      {step === 4 && <AcknowledgementsStep orgId={orgId} />}

      {step === 5 && (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">5) Review &amp; finish</h2>
          <p className="text-sm text-zinc-600">
            Everything is configured. Double-check the highlights below and select <strong>Finish</strong> to wrap up onboarding.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-600">Organization ID</span>
              <span className="font-mono text-slate-800">{orgId || "Pending..."}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-600">Plan</span>
              <span>{summary.plan ? `${summary.plan} (${summary.cycle || "monthly"})` : "Starter (default)"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-600">Seats</span>
              <span>{summary.seats ?? 1}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-600">Translate Unlimited</span>
              <span>{translateUnlimited || translateLocked ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium text-slate-600">Privacy statement</span>
              <span
                className="max-w-sm truncate text-slate-700"
                title={privacy.trim() ? privacy.trim() : undefined}
              >
                {privacy.trim() ? privacy.trim() : "No statement added yet"}
              </span>
            </div>
          </div>
          <p className="text-sm text-zinc-600">
            Need to tweak something later? You can revisit these settings and acknowledgements in the Portal.
          </p>
        </section>
      )}

      {step > 1 && (
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
            {busy ? "Working…" : step < 5 ? "Next" : "Finish"}
          </button>
        </div>
      )}
    </main>
  );
}

/*********************
 * Acknowledgements *
 *********************/

function useOrgAcknowledgements(orgId: string | null) {
  const [templates, setTemplates] = useState<AckTemplate[]>([]);

  useEffect(() => {
    if (!orgId) {
      setTemplates([]);
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const colRef = collection(db, "orgs", orgId, "ackTemplates");
      unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!isMounted) return;
          const rows = snapshot.docs
            .map(
              (docSnap) =>
                ({
                  id: docSnap.id,
                  ...(docSnap.data() as Partial<AckTemplate>)
                } as AckTemplate)
            )
            .sort((a, b) => {
              const orderA = Number(a.order ?? a.createdAt ?? 0);
              const orderB = Number(b.order ?? b.createdAt ?? 0);
              if (orderA === orderB) {
                const nameA = (a.title || "").toLowerCase();
                const nameB = (b.title || "").toLowerCase();
                return nameA.localeCompare(nameB);
              }
              return orderA - orderB;
            });
          setTemplates(rows);
        },
        (error) => {
          console.error("[onboard] failed to load acknowledgements", error);
          if (isMounted) setTemplates([]);
        }
      );
    } catch (error) {
      console.error("[onboard] setup acknowledgements listener failed", error);
      setTemplates([]);
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [orgId]);

  return templates;
}

type AcknowledgementsStepProps = {
  orgId: string | null;
};

function AcknowledgementsStep({ orgId }: AcknowledgementsStepProps) {
  const templates = useOrgAcknowledgements(orgId);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    if (!templates.some((ack) => ack.id === openId)) {
      setOpenId(null);
    }
  }, [templates, openId]);

  const hasOrg = Boolean(orgId);

  return (
    <section className="rounded-2xl border p-6 space-y-4">
      <h2 className="text-lg font-semibold">4) Add acknowledgements</h2>
      <p className="text-sm text-zinc-600">
        Acknowledgements are short policies callers accept before connecting. Add them now to set expectations for callers.
      </p>

      {!hasOrg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Create your organization in Step 1 to start adding acknowledgements.
        </div>
      )}

      {hasOrg && <AckCreateForm orgId={orgId} />}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
        {templates.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No acknowledgements yet. They will appear here once added.</div>
        ) : (
          templates.map((ack) => {
            const isOpen = openId === ack.id;
            const label = ack.title?.trim() || ack.id;
            const content = ack.body ?? ack.text ?? (ack as any)?.text ?? "";
            return (
              <div key={ack.id} className="p-4">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : ack.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="font-medium text-slate-800">{label}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        ack.required ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {ack.required ? "Required" : "Optional"}
                    </span>
                    <span className="text-xs text-slate-500">{isOpen ? "Hide" : "Show"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {content?.trim() || "(No content provided yet.)"}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasOrg && templates.length > 0 && (
        <p className="text-xs text-slate-500">
          These acknowledgements appear before each caller session. Update the list anytime from Portal &gt; Organizations.
        </p>
      )}
    </section>
  );
}

type AckCreateFormProps = {
  orgId: string | null;
};

function AckCreateForm({ orgId }: AckCreateFormProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) {
      setError("Create your organization first.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) {
        setError("Please sign in first.");
        return;
      }
      const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/ackTemplates/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim(), text, required })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        const errCode = String(data?.code || data?.error || response.statusText || "server_error");
        setError(formatAckError(errCode));
        return;
      }
      setTitle("");
      setText("");
      setRequired(false);
      setNotice("Acknowledgement added.");
    } catch {
      setError(formatAckError("network_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">Error: {error}</div>}
      {notice && <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
              setNotice(null);
            }}
            placeholder="Privacy acknowledgement"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex items-end justify-end gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => {
                setRequired(event.target.checked);
                setError(null);
                setNotice(null);
              }}
            />{" "}
            Required
          </label>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Adding..." : "Add template"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Text</label>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
            setNotice(null);
          }}
          rows={4}
          placeholder="Summarize the policy the caller accepts..."
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
        />
      </div>
    </form>
  );
}

function formatAckError(code: string) {
  switch (code) {
    case "forbidden":
      return "You do not have permission to add acknowledgements for this org.";
    case "no_token":
      return "Please sign in first.";
    case "missing_title":
      return "Title is required.";
    case "missing_org":
      return "Organization is required.";
    case "network_error":
      return "Network error. Please try again.";
    default:
      return code;
  }
}

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

type CreateOrgStepProps = {
  onCreated?: (slug: string) => void;
};

function CreateOrgStep({ onCreated }: CreateOrgStepProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const auto = slugifyName(name) || "org";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr("Please enter an organization name.");
      return;
    }
    setBusy(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) {
        setErr("Please sign in first.");
        return;
      }
      const res = await fetch("/api/orgs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.code ?? data?.error ?? "server_error");
        return;
      }
      const createdSlug: string = data.slug ?? data.orgId ?? auto;
      try {
        window.localStorage.setItem("lastCreatedOrgId", createdSlug);
        window.localStorage.setItem("activeOrgId", createdSlug);
      } catch {
        // ignore storage failures
      }
      if (onCreated) {
        onCreated(createdSlug);
      }
    } catch (error) {
      setErr("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border p-6 space-y-4">
      <h2 className="text-lg font-semibold">1) Create your organization</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Organization name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Pty Ltd"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Org ID (slug)</label>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {auto} <span className="ml-2 text-slate-400">(auto-generated)</span>
            </div>
          </div>
        </div>

        {err && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Error: {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className={clsx(
            "inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white",
            (busy || !name.trim()) && "opacity-60 cursor-not-allowed"
          )}
        >
          {busy ? <Spinner /> : null}
          Create organization
        </button>
      </form>
    </section>
  );
}

