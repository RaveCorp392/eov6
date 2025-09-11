// app/pricing/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function PricingPage() {
  const title = "Pricing";
  const description = "Start free. Upgrade when you need more seats and features. EOV6 adds an instant, ephemeral chat channel to any call—no installs.";
  const schema = {"@context":"https://schema.org","@type":"WebPage",name:title,description};

  const tiers = [
    { name: "Free", price: "$0", period: "/mo", cta: { label: "Start free", href: "/agent" }, features: ["1 seat","Up to 20 sessions / mo","Ephemeral chat (no storage)","Email support"] },
    { name: "Pro", price: "$9", period: "/seat/mo", highlight: true, cta: { label: "Start 14-day trial", href: "/agent" }, features: ["2–250 seats","Unlimited sessions","Org toggles (e.g., uploads)","Basic analytics","Priority support"] },
    { name: "Enterprise", price: "Custom", period: "", cta: { label: "Contact sales", href: "/contact" }, features: ["250+ seats","SAML/OIDC SSO","Security brief & pilot plan","Volume pricing","Dedicated support"] },
  ];

  return (
    <>
      <SEO title={title} description={description} url="https://eov6.com/pricing" schema={schema} />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Pricing</h1>
          <p className="mt-3 text-lg text-slate-600">Start free. Upgrade as your team grows. Cancel anytime.</p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-6 ${t.highlight ? "ring-2 ring-blue-600" : ""}`}>
              <h2 className="text-xl font-semibold">{t.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{t.price}</span>
                <span className="text-slate-500">{t.period}</span>
              </div>
              <ul className="mt-4 space-y-2 text-slate-700 list-disc pl-5">
                {t.features.map((f) => (<li key={f}>{f}</li>))}
              </ul>
              <Link href={t.cta.href} className={`mt-6 inline-block rounded-xl px-5 py-3 font-medium ${t.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border hover:bg-slate-50"}`}>
                {t.cta.label}
              </Link>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
