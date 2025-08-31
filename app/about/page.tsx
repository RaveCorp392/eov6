'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <main
      className="col"
      style={{
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <section className="panel" style={{ width: '100%', maxWidth: 640 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>About EOV6</h1>
        <p className="small" style={{ marginTop: 4 }}>Ephemeral one-visit secure chat</p>

        <div style={{ height: 12 }} />

        <p>
          EOV6 lets an agent and a caller share a temporary, secure chat for the
          duration of a support session. When the session ends, the transcript and any
          shared files are cleared according to policy.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 18 }}>How it works</h2>
        <ol style={{ paddingLeft: 18, marginTop: 8 }}>
          <li>Agent creates a session and gives the caller a 6-digit code.</li>
          <li>Caller goes to <span className="mono">eov6.com</span> and enters the code.</li>
          <li>Both parties can chat and exchange permitted files during the session.</li>
          <li>Ending the session clears the shared chat for both sides.</li>
        </ol>

        <h2 style={{ fontSize: 18, marginTop: 18 }}>Privacy & data handling</h2>
        <p>
          EOV6 is built around ephemeral retention. We store only what’s needed to run the
          current session. When a session ends, shared data is cleared by design.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 18 }}>Accessibility</h2>
        <p>
          We’re aligning with WCAG AA guidance on contrast, focus states, keyboard
          navigation, and scalable text. If something doesn’t work for you, please let us
          know so we can fix it.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <Link href="/" className="button" aria-label="Back to join screen">
            Back to join
          </Link>
          <a
            className="button"
            href="mailto:hello@eov6.com?subject=EOV6%20feedback"
            aria-label="Email feedback"
          >
            Send feedback
          </a>
        </div>

        <p className="small" style={{ marginTop: 12 }}>
          Build: UI polish stream • {new Date().toISOString().slice(0, 10)}
        </p>
      </section>
    </main>
  );
}
