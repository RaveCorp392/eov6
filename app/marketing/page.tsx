// app/marketing/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function MarketingPage() {
  const description = "EOV6 adds a temporary text channel to any call via a 6-digit code. Fix misheard names, emails, and numbers; raise FCR and CSAT. No installs. Ephemeral by default.";
  const schema = {"@context":"https://schema.org","@type":"SoftwareApplication",name:"EOV6",applicationCategory:"BusinessApplication",operatingSystem:"Any",offers:{"@type":"Offer",price:"0",priceCurrency:"USD"},description};

  return (
    <>
      <SEO title="Clarity at every call" description={description} url="https://eov6.com/marketing" schema={schema} />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Clarity at every call</h1>
          <p className="mt-4 text-lg text-slate-600">
            Give agents and customers a temporary text channel during a live call via a simple 6-digit code. No installs. Secure. Ephemeral.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/agent" className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700">Start free</Link>
            <Link href="/solutions/call-centers" className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-50">For call centers</Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            “76% of consumers would stop doing business after one bad support experience.”<sup>1</sup> Clear it up with EOV6.
          </p>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {h:"Fix miscommunication fast", p:"Type the critical bits—names, emails, numbers—so nothing is misheard. End repeat calls."},
            {h:"Raise FCR & CSAT", p:"Clarity boosts first-call resolution and customer satisfaction. Happier customers, calmer agents."},
            {h:"Privacy by default", p:"Ephemeral sessions: data disappears when the call ends. No storage, no baggage."},
          ].map(c => (
            <div key={c.h} className="rounded-2xl border p-6">
              <h3 className="font-semibold text-lg">{c.h}</h3>
              <p className="mt-2 text-slate-600">{c.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Who it’s for</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Card title="Outsourced & in-house call centers" body="Bridge accents and lines instantly. Prove performance. Ship better CX today." href="/solutions/call-centers" />
            <Card title="Government contact centers" body="Serve diverse communities with a privacy-first clarity layer. Browser-based rollout." href="/solutions/government" />
            <Card title="Global SMBs" body="Close sales and support tickets without language roadblocks. Start in minutes." href="/solutions/smb" />
          </div>
        </section>

        <section className="mt-16 rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold">Proof you can publish</h2>
          <p className="mt-2 text-slate-600">
            Until live pilots land, use scenario-based, clearly labeled hypothetical case studies for each segment.
            See templates: <Link className="text-blue-600 underline" href="/case-studies/hypothetical-bpo">BPO</Link>, <Link className="text-blue-600 underline" href="/case-studies/hypothetical-government">Government</Link> and <Link className="text-blue-600 underline" href="/case-studies/hypothetical-smb">SMB</Link>.
          </p>
        </section>

        <footer className="mt-16 text-xs text-slate-500">
          <p><sup>1</sup> Keep this stat linked to your preferred live source on the blog post for credibility.</p>
        </footer>
      </main>
    </>
  );
}

function Card({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="block rounded-2xl border p-6 hover:shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-slate-600">{body}</p>
      <div className="mt-4 text-blue-600 font-medium">Learn more →</div>
    </Link>
  );
}
