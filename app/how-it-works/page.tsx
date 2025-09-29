export const metadata = {
  title: "How EOV6 Works - Agent & Caller Guide",
  description:
    "Step-by-step guide for agents and callers: sessions, acknowledgements, file uploads, and live translation.",
};

export default function HowPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-3xl font-bold mb-3">How EOV6 Works</h1>
        <p className="lead mb-6">
          A clean, fast chat between agent and caller, with optional file uploads and live translation.
        </p>
        <article className="prose prose-zinc">
          <h2>1) Start a session</h2>
          <ol>
            <li>Agent clicks <strong>Start a new session</strong> to get a 6-digit code.</li>
            <li>Caller opens the link or enters the code at <code>/s/&lt;code&gt;</code>.</li>
          </ol>

          <h2>2) Acknowledgement</h2>
          <p>
            Agents press <em>Send acknowledgement</em> from the session. The caller accepts in a modal (with name if
            required). The chat logs a system line that it was accepted.
          </p>

          <h2>3) Caller details</h2>
          <p>Caller can add name, email, and phone. Agents see these in real time and can add notes on the agent side.</p>

          <h2>4) File uploads</h2>
          <p>Caller can upload images or PDFs. The chat shows a clickable file link for both sides.</p>

          <h2>5) Live translate</h2>
          <ul>
            <li>Enable the toggle and pick <em>Agent</em> and <em>Caller</em> languages.</li>
            <li>Each side sees messages in their own language; the sender sees their original text.</li>
            <li>Use <em>Preview</em> for up to 5 free previews per session. After that, send is metered unless your org has Unlimited.</li>
          </ul>

          <h2>6) End session</h2>
          <p>Use <strong>End session &amp; delete data</strong> when finished to clear chat and uploads, keeping data minimal.</p>

          <h2>Privacy &amp; safety</h2>
          <ul>
            <li>Session data is destroyed when you end the session.</li>
            <li>Translation quality varies; the UI warns that accuracy is not guaranteed.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
