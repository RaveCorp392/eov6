// app/solutions/government/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function Government() {
  const title = "For Government Contact Centers";
  const description = "Serve diverse communities with a privacy-first clarity layer. EOV6 is browser-based and ephemeral—ideal for sensitive environments.";
  const schema = {"@context":"https://schema.org","@type":"WebPage",name:title,description};

  return (
    <>
      <SEO title={title} description={description} url="https://eov6.com/solutions/government" schema={schema} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-slate-600">Ensure every constituent is understood—regardless of language or accent—without storing chat content.</p>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Privacy by default</h2>
            <p className="mt-2 text-slate-600">Ephemeral sessions mean chat content is not retained after the call ends. Reduce data-retention risk.</p>
          </div>
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Inclusive service</h2>
            <p className="mt-2 text-slate-600">Bridge language and clarity gaps instantly in the browser. No installs for agents or the public.</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Roll out fast</h2>
          <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
            <li>Browser-only—no desktop deployments.</li>
            <li>Simple code flow for callers—accessible from any device.</li>
            <li>Configurable features and audit messaging.</li>
          </ul>
          <div className="mt-5 flex gap-3">
            <Link href="/agent" className="rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700">Explore a sandbox</Link>
            <Link href="/case-studies/hypothetical-government" className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-50">See a clearly labeled hypothetical case</Link>
          </div>
        </section>
      </main>
    </>
  );
}
