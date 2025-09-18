// app/solutions/smb/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function SMB() {
  const title = "For Global SMBs";
  const description = "Close sales and solve support calls when language or clarity blocks progress. EOV6 adds a quick text channel to your call—no installs.";
  const schema = {"@context":"https://schema.org","@type":"WebPage",name:title,description};

  return (
    <>
      <SEO title={title} description={description} url="https://eov6.com/solutions/smb" schema={schema} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-slate-600">Don’t lose a customer over misheard details. Spin up a quick chat link mid-call and get aligned in seconds.</p>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { h: "Start in minutes", p: "No IT, no installs. Just create a code and share it." },
            { h: "Win more deals", p: "When clarity is instant, confidence and conversions follow." },
            { h: "Fair pricing", p: "Start free. Upgrade as your team grows." },
          ].map((c) => (
            <div key={c.h} className="rounded-2xl border p-6">
              <h2 className="text-lg font-semibold">{c.h}</h2>
              <p className="mt-2 text-slate-600">{c.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex gap-3">
            <Link href="/agent" className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700">Try it free</Link>
            <Link href="/case-studies/hypothetical-smb" className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-50">See a (clearly labeled) hypothetical</Link>
          </div>
        </section>
      </main>
    </>
  );
}
