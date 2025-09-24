export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Thanks for subscribing 🎉</h1>
      <p className="mt-2 text-slate-600">
        Your EOV6 subscription is now active. You can start a session right away.
      </p>
      <div className="mt-6 flex gap-3">
        <a href="https://agent.eov6.com/agent" className="btn btn-primary">Start a session</a>
        <a href="/pricing#roi" className="btn btn-outline">Run ROI estimate</a>
      </div>
      <p className="mt-10 text-sm text-slate-500">
        Need help? Email <a className="underline" href="mailto:support@eov6.com">support@eov6.com</a>
      </p>
    </main>
  );
}
