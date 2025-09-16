export const metadata = {
  title: "How EOV6 Works — Agent & Caller Guide",
  description: "Step-by-step guide for agents and callers: sessions, acknowledgements, file uploads, and live translation.",
};

export default function HowItWorks() {
  return (
    <main className="max-w-3xl mx-auto p-6 prose prose-slate">
      <h1>How EOV6 Works</h1>
      <p>EOV6 gives you a clean, fast chat session between an agent and a caller, with optional file uploads and bi-directional live translation.</p>

      <h2>1) Start a Session</h2>
      <ol>
        <li>Agent clicks <strong>Start a new session</strong> to get a 6-digit code.</li>
        <li>Caller opens the link or enters the code at <code>/s/&lt;code&gt;</code>.</li>
      </ol>

      <h2>2) Acknowledgement</h2>
      <p>Agents press <em>Send acknowledgement</em> from the session. The caller accepts in a modal (with name if required). The chat logs a system line that it was accepted.</p>

      <h2>3) Caller Details</h2>
      <p>Caller can add name, email, and phone. Agents see these in real time and can add notes on the agent side.</p>

      <h2>4) File Uploads</h2>
      <p>Caller can upload images or PDFs. The chat shows a clickable file link for both sides.</p>

      <h2>5) Live Translate</h2>
      <ul>
        <li>Enable the toggle and pick <em>Agent</em> and <em>Caller</em> languages.</li>
        <li>Each side sees messages in their own language; the sender sees their original text.</li>
        <li>Use <em>Preview</em> for up to 5 free previews per session. After that, send is metered unless your org has Unlimited.</li>
      </ul>

      <h2>6) End Session</h2>
      <p>Use <strong>End session &amp; delete data</strong> when finished to clear chat and uploads, keeping data minimal.</p>

      <h2>Privacy &amp; Safety</h2>
      <ul>
        <li>Session data is destroyed when you end the session.</li>
        <li>Translation quality varies; the UI warns that accuracy isn’t guaranteed.</li>
      </ul>
    </main>
  );
}
