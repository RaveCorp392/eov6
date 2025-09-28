export const metadata = { title: "Privacy — EOV6" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-zinc-700 mb-6">
        We respect your privacy. This page describes what we collect and why.
      </p>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">What we collect</h2>
          <ul className="list-disc ml-6">
            <li>Account data (email, org details)</li>
            <li>Operational data (sessions, acks, invites)</li>
            <li>Billing metadata from Stripe (no card numbers)</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">How we use it</h2>
          <p>To provide the service, comply with law, and improve reliability and safety.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Data processors</h2>
          <p>We use trusted providers (e.g., Stripe, Firebase) under their terms.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your choices</h2>
          <p>Contact us to access or delete your account data. Disabling required data may limit service.</p>
        </div>
        <div className="text-xs text-zinc-500">
          This is a product overview, not legal advice. Replace with your final legal text before launch.
        </div>
      </section>
    </main>
  );
}
