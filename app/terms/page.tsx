export const metadata = { title: "Terms — EOV6" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <section className="space-y-4 text-zinc-700">
        <p>By using EOV6 you agree to these terms.</p>
        <div>
          <h2 className="text-lg font-semibold">Accounts</h2>
          <p>You are responsible for your login credentials and org configuration.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Payment</h2>
          <p>Subscriptions are billed by Stripe. Fees are non-refundable unless required by law.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Acceptable use</h2>
          <p>No unlawful, abusive, or privacy-violating behavior.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Liability</h2>
          <p>Service is provided “as is”. To the fullest extent permitted by law, we disclaim indirect damages.</p>
        </div>
        <div className="text-xs text-zinc-500">
          Placeholder copy — replace with your legal terms before launch.
        </div>
      </section>
    </main>
  );
}
