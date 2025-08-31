export const metadata = {
  title: "About EOV6",
  description: "What EOV6 is, how it works, and how we keep data safe.",
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-2xl font-semibold mb-4">About EOV6</h1>

      <p className="mb-6">
        EOV6 (“Ephemeral One-Visit v6”) is a tiny, secure bridge for agents and
        callers to share short messages and files during a live interaction.
        Sessions are temporary and cleared automatically by policy when the
        session ends.
      </p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">How it works</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>The agent creates a session and reads a six-digit code to the caller.</li>
          <li>The caller enters the code at <span className="mono">eov6.com</span>.</li>
          <li>Both sides can exchange short messages and upload a file (image or PDF).</li>
          <li>When the session ends, data is cleared as part of our ephemerality policy.</li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Privacy & data retention</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chats and files are <strong>ephemeral</strong> and removed at the end of the session.</li>
          <li>No profiling, no background analytics on chat contents.</li>
          <li>Only the session participants can see the shared data.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Accessibility</h2>
        <p className="mb-2">
          We aim to meet WCAG 2.2 AA for colour contrast, focus states, labels,
          and keyboard support. Current highlights:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>High-contrast theme and visible focus rings.</li>
          <li>Keyboard first: <span className="mono">Enter</span> sends, <span className="mono">Shift+Enter</span> new line.</li>
          <li>ARIA labels on the join input and buttons.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p>
          Questions or feedback? Reach us at{" "}
          <a className="underline" href="mailto:hello@eov6.com">hello@eov6.com</a>.
        </p>
      </section>

      <p className="small">Build: v0.1 – live test environment.</p>
    </main>
  );
}
