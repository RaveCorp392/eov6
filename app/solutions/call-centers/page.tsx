// app/solutions/call-centers/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function CallCenters() {
  const title = "For Call Centers & BPOs";
  const description = "Boost FCR and CSAT with a no-install clarity layer for any phone call. EOV6 adds a temporary text channel to fix misheard details in seconds.";
  const schema = {"@context":"https://schema.org","@type":"WebPage",name:title,description};

  return (
    <>
      <SEO title={title} description={description} url="https://eov6.com/solutions/call-centers" schema={schema} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-slate-600">When accents, line quality, or complex spellings get in the way, agents need instant clarity—without leaving the call.</p>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Raise First-Call Resolution</h2>
            <p className="mt-2 text-slate-600">Type critical info—names, emails, addresses—so nothing is misheard. Resolve issues on the first call and reduce repeat contacts.</p>
          </div>
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Happier customers, calmer agents</h2>
            <p className="mt-2 text-slate-600">Clarity boosts satisfaction and lowers agent stress. Turn tough calls into smooth outcomes.</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Why EOV6 wins</h2>
          <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
            <li>No install. Works in any browser—deploy same-day.</li>
            <li>Ephemeral by default—data disappears when a session ends.</li>
            <li>Simple 6-digit code flow—easy for agents and callers.</li>
            <li>Scales from 10 agents to 10,000 seats.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Get started</h2>
          <div className="mt-4 flex gap-3">
            <Link href="/agent" className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700">Start a free pilot</Link>
            <Link href="/case-studies/hypothetical-bpo" className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-50">See a (clearly labeled) hypothetical case</Link>
          </div>
        </section>
      </main>
    </>
  );
}
