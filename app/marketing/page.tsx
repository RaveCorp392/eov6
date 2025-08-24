// app/marketing/page.tsx
import Link from "next/link";

export default function MarketingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1">Ephemeral by default</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">Agent + Caller</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">TTL auto-deletes</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          EOV6 &mdash; Secure details, shared fast.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          When a conversation moves to a phone call, getting names, emails and phone numbers
          right is painful. EOV6 gives agents a session code the caller can enter at
          <span className="font-semibold"> eov6.com</span> to send verified contact details
          and chat stored ephemerally and deleted by policy.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/agent"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Open agent console
          </Link>

          <a
            href="https://eov6.com"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
          >
            Caller IVR / code entry
          </a>

          <a
            href="mailto:partners@meetsafe.io"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
          >
            Contact us
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Prefer email? partners@meetsafe.io
        </p>
      </section>

      {/* How it works */}
      <section className="mt-20">
        <h2 className="text-left text-xl font-semibold">How it works</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            step="01"
            title="Agent opens a session"
            body="Agent gets a short code. Share it verbally during a call or paste it in chat."
          />
          <Card
            step="02"
            title="Caller goes to eov6.com"
            body="Caller taps code (or IVR initiated), enters the code, and sees a simple secure chat."
          />
          <Card
            step="03"
            title="Send details instantly"
            body="Caller can push full name, email and phone with one button; agent can also ask with canned prompts."
          />
          <Card
            step="04"
            title="Ephemeral by policy"
            body="Sessions auto-expire via TTL. No long-term PII by default. Export/integrate only if your policy requires."
          />
        </div>
      </section>

      {/* MVP status */}
      <section className="mt-16">
        <h3 className="text-left text-lg font-semibold">What&apos;s working today</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Pill>Agent console with live chat.</Pill>
          <Pill>Caller page with &quot;Send details&quot; (name, email, phone).</Pill>
          <Pill>Canned prompts: Ask name / Ask email / Ask phone.</Pill>
          <Pill>One-time session codes; org prefixes possible (e.g., SSQ-XXXXXX).</Pill>
          <Pill>Time-to-live (TTL) deletion policy.</Pill>
          <Pill>Contact routing via partners@meetsafe.io.</Pill>
        </div>
      </section>

      {/* Near-term roadmap */}
      <section className="mt-16">
        <h3 className="text-left text-lg font-semibold">Near-term roadmap</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Pill>File uploads (images/PDFs) with strict TTL + privacy mode.</Pill>
          <Pill>Consent and T&amp;Cs (checkbox + audit event).</Pill>
          <Pill>Confirmation flows (e.g., confirm spelling before commit).</Pill>
          <Pill>Billing portal (Stripe) with usage-based pricing.</Pill>
          <Pill>Org admin, canned prompt libraries, and audit exports.</Pill>
          <Pill>Optional CRM/webhook integration.</Pill>
        </div>
      </section>

      {/* Trust */}
      <section className="mt-16">
        <h3 className="text-left text-lg font-semibold">Privacy by design</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Ephemeral storage"
            body="Messages and profile data live only for the configured TTL. By default, no long-term PII at rest. You choose if/when to export."
          />
          <InfoCard
            title="Least-data principle"
            body="We collect only what is needed to complete the conversation: name, email, phone, and messages. Nothing else by default."
          />
          <InfoCard
            title="Enterprise-friendly"
            body="Per-org prefixes for codes, audit logs, and downstream integration are available when your compliance team is ready."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16">
        <div className="rounded-2xl bg-indigo-600 px-6 py-10 text-center text-indigo-50">
          <h3 className="text-2xl font-semibold">Ready to try it with your team?</h3>
          <p className="mx-auto mt-2 max-w-2xl text-indigo-100">
            Open an agent session, ask the caller to enter the code, and push details in seconds.
            For pricing or a pilot, we&apos;ll set you up.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/agent"
              className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Open agent console
            </Link>
            <a
              href="mailto:partners@meetsafe.io"
              className="rounded-lg border border-indigo-300 px-4 py-2 font-medium text-white hover:bg-indigo-500"
            >
              partners@meetsafe.io
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EOV6. All rights reserved.
      </footer>
    </main>
  );
}

/* ---------- tiny presentational helpers ---------- */

function Card(props: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-semibold text-slate-500">{props.step}</div>
      <div className="mt-1 text-base font-semibold">{props.title}</div>
      <p className="mt-1 text-sm text-slate-600">{props.body}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      {children}
    </div>
  );
}

function InfoCard(props: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="text-base font-semibold">{props.title}</div>
      <p className="mt-1 text-sm text-slate-600">{props.body}</p>
    </div>
  );
}
