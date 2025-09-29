import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="brand-hero py-8">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-3xl font-bold mb-3">About EOV6</h1>
        <p className="lead mb-6">Ephemeral one-visit secure chat.</p>
        <article className="prose prose-zinc">
          <p>
            EOV6 lets an agent and a caller share a temporary, secure chat for the duration of a support session. When
            the session ends, the transcript and any shared files are cleared according to policy.
          </p>

          <h2>How it works</h2>
          <ol>
            <li>Agent creates a session and gives the caller a 6-digit code.</li>
            <li>Caller goes to <span className="font-mono">eov6.com</span> and enters the code.</li>
            <li>Both parties can chat and exchange permitted files during the session.</li>
            <li>Ending the session clears the shared chat for both sides.</li>
          </ol>

          <h2>Privacy &amp; data handling</h2>
          <p>
            EOV6 is built around ephemeral retention. We store only what is needed to run the current session. When a
            session ends, shared data is cleared by design.
          </p>

          <h2>Accessibility</h2>
          <p>
            We align with WCAG AA guidance on contrast, focus states, keyboard navigation, and scalable text. If
            something does not work for you, please let us know so we can fix it.
          </p>
        </article>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="button-primary">
            Back to join
          </Link>
          <a className="button-ghost" href="mailto:hello@eov6.com?subject=EOV6%20feedback">
            Send feedback
          </a>
        </div>

        <p className="text-xs text-zinc-500 mt-4">Build: UI polish stream - {new Date().toISOString().slice(0, 10)}</p>

        <section aria-labelledby="explore" className="mt-10">
          <h2 id="explore" className="text-lg font-semibold mb-4">
            Explore EOV6
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/pricing#roi" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">ROI calculator</div>
              <div className="text-sm text-zinc-600">Estimate your annual savings.</div>
            </Link>
            <Link href="/pricing" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">Pricing</div>
              <div className="text-sm text-zinc-600">Starter, Pro, Enterprise + Translate add-on.</div>
            </Link>
            <Link href="/solutions/call-centers" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">Solutions: Call Centers</div>
              <div className="text-sm text-zinc-600">Value props and demo CTAs for teams.</div>
            </Link>
            <Link href="/how-it-works" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">How it works</div>
              <div className="text-sm text-zinc-600">Step-by-step join and session flow.</div>
            </Link>
            <Link href="/agent" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">Agent console</div>
              <div className="text-sm text-zinc-600">Start a demo session now.</div>
            </Link>
            <Link href="/contact" className="card p-4 hover:border-brand hover:shadow">
              <div className="font-medium">Contact / sales</div>
              <div className="text-sm text-zinc-600">Questions or enterprise needs? Get in touch.</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
