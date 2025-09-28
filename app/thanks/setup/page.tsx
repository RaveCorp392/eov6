export default function ThanksSetup() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-bold mb-3">You&apos;re all set {"\u{1F389}"}</h1>
      <p className="text-zinc-700 mb-6">
        Setup complete. Here&apos;s how it works from here:
      </p>

      <div className="rounded-2xl border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-2">What you can do next</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Open the Agent console to start a session and share the 6-digit code with callers.</li>
          <li>Use your Portal to invite teammates or adjust privacy / acknowledgement text anytime.</li>
          <li>Translate Unlimited stays enabled if your plan includes it.</li>
        </ul>
      </div>

      <div className="rounded-2xl border p-6 bg-amber-50">
        <h2 className="text-lg font-semibold mb-2">Why this matters</h2>
        <p className="text-amber-900">
          76% of customers won&apos;t reuse a service after one bad support interaction.
          Getting acknowledgements right helps prevent that one bad call.
        </p>
      </div>
    </main>
  );
}

