import Link from "next/link";

export default function Page() {
  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );

  const Section = ({
    title,
    children,
    kicker,
  }: {
    title: string;
    children: React.ReactNode;
    kicker?: string;
  }) => (
    <section className="mx-auto max-w-6xl px-4 py-16">
      {kicker && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {kicker}
        </p>
      )}
      <h2 className="mb-6 text-2xl font-semibold text-slate-900">{title}</h2>
      <div className="prose prose-slate max-w-none">{children}</div>
    </section>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 pt-20 pb-10 text-center">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Pill>Ephemeral by default</Pill>
          <Pill>Agent + Caller</Pill>
          <Pill>TTL auto-deletes</Pill>
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          EOV6 — Secure details, shared fast.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-slate-600">
          When a conversation moves to a phone call, getting names, emails and
          phone numbers right is painful. EOV6 gives agents a session code the
          caller can enter at <span className="font-semibold">eov6.com</span> to
          send verified contact details and chat—stored ephemerally and deleted
          by policy.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/agent"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-white shadow-sm transition hover:bg-indigo-700"
          >
            Open agent console
          </Link>
          <Link
            href="/ivr"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Caller IVR / code entry
          </Link>
          <a
            href="mailto:partners@meetsafe.io"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Contact us
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Prefer email? partners@meetsafe.io
        </p>
      </header>

      {/* HOW IT WORKS */}
      <Section title="How it works" kicker="Product">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 !list-none p-0">
          {[
            {
              n: "01",
              t: "Agent opens a session",
              d: "Agent gets a short code. Share it verbally during a call or paste it in chat.",
            },
            {
              n: "02",
              t: "Caller goes to eov6.com",
              d: "Caller taps “IVR initiated”, enters the code, and sees a simple secure chat.",
            },
            {
              n: "03",
              t: "Send details instantly",
              d: "Caller can push full name, email and phone with one button; agent can also ask for them with canned prompts.",
            },
            {
              n: "04",
              t: "Ephemeral by policy",
              d: "Sessions auto-expire via TTL. No long-term PII by default. Export/integrate only if your policy requires.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 text-xs font-semibold tracking-widest text-indigo-600">
                {s.n}
              </div>
              <div className="mb-1 text-lg font-semibold text-slate-900">
                {s.t}
              </div>
              <p className="text-sm text-slate-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* CURRENT CAPABILITIES */}
      <Section title="What’s working today" kicker="MVP">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Agent console with live chat.",
            "Caller page with ‘Send details’ (name, email, phone).",
            "Canned prompts: Ask name / Ask email / Ask phone.",
            "One-time session codes; org prefixes possible (e.g., SSQ-XXXXXX).",
            "Time-to-live (TTL) deletion policy.",
            "Contact routing via partners@meetsafe.io.",
          ].map((x) => (
            <li
              key={x}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              {x}
            </li>
          ))}
        </ul>
      </Section>

      {/* ROADMAP */}
      <Section title="Near-term roadmap" kicker="What’s next">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "File uploads (images/PDFs) with strict TTL + ‘privacy mode’.",
            "Consent and T&Cs (checkbox + audit event).",
            "Confirmation flows (e.g., confirm spelling before commit).",
            "Billing portal (Stripe) with usage-based pricing.",
            "Org admin, canned prompt libraries, and audit exports.",
            "Optional CRM/webhook integration.",
          ].map((x) => (
            <li
              key={x}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              {x}
            </li>
          ))}
        </ul>
      </Section>

      {/* TRUST */}
      <Section title="Privacy by design" kicker="Trust">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-slate-900">
              Ephemeral storage
            </h3>
            <p className="text-sm text-slate-600">
              Messages and profile data live only for the configured TTL. By
              default, no long-term PII at rest. You choose if/when to export.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-slate-900">
              Least-data principle
            </h3>
            <p className="text-sm text-slate-600">
              We collect only what’s needed to complete the conversation: name,
              email, phone, and messages. Nothing else by default.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-slate-900">
              Enterprise-friendly
            </h3>
            <p className="text-sm text-slate-600">
              Per-org prefixes for codes, audit logs, and downstream integration
              are available when your compliance team is ready.
            </p>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="mx-auto mb-24 max-w-6xl px-4">
        <div className="rounded-3xl bg-indigo-600 p-8 text-white md:p-12">
          <h3 className="text-2xl font-semibold">
            Ready to try it with your team?
          </h3>
          <p className="mt-2 max-w-2xl text-indigo-100">
            Open an agent session, ask the caller to enter the code, and push
            details in seconds. For pricing or a pilot, we’ll set you up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/agent"
              className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              Open agent console
            </Link>
            <a
              href="mailto:partners@meetsafe.io"
              className="rounded-xl border border-white/50 px-5 py-3 font-medium text-white/90 transition hover:bg-white/10"
            >
              partners@meetsafe.io
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-16 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} EOV6. All rights reserved.
      </footer>
    </main>
  );
}
