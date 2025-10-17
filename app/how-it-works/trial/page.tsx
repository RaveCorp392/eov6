import Link from "next/link";

export const metadata = {
  title: "How the Free Trial Works",
  description: "Understand the five quick steps for starting and managing your 30-day free trial.",
};

export default function TrialHowItWorksPage() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-4 text-3xl font-bold">How the 30-day free trial works</h1>
        <ol className="space-y-4 text-base text-zinc-700">
          <li>
            <strong>Pick a plan on Pricing.</strong> Choose the plan that matches your team, then head to checkout.
          </li>
          <li>
            <strong>Stripe shows $0 due today plus the trial end date.</strong> You&apos;ll see exactly when billing would
            begin.
          </li>
          <li>
            <strong>Use everything during the trial.</strong> All features stay unlocked while you&apos;re evaluating.
          </li>
          <li>
            <strong>Cancel anytime from Billing in the portal.</strong> End the trial in a couple of clicks if it&apos;s not
            a fit.
          </li>
          <li>
            <strong>If you don&apos;t cancel, it auto-continues monthly.</strong> We&apos;ll bill the plan price on the trial end
            date.
          </li>
        </ol>
        <div className="mt-8">
          <Link
            href="/pricing#plans"
            className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Go to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
