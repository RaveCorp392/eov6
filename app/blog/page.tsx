// app/blog/page.tsx
import Link from "next/link";
import SEO from "@/components/SEO";

export default function BlogIndex() {
  const title = "Blog";
  const description = "Insights on call clarity, customer experience, and practical ways to boost FCR and CSAT without heavy tooling.";
  const posts = [
    { slug: "why-clarity-matters", title: "Why Clarity Matters: The Hidden Cost of Misheard Calls (and a 76% wake-up stat)", excerpt: "Miscommunication tanks FCR and CSAT. Here’s a simple, no-install way to fix the toughest 2 minutes of any call.", date: "2025-09-05" },
    { slug: "call-center-glossary", title: "Call Center Glossary: Key Metrics, Acronyms, and What They Really Mean", excerpt: "From FCR to CSAT to AHT, a plain-English guide to the abbreviations that drive performance.", date: "2025-09-05" },
  ];
  const schema = {"@context":"https://schema.org","@type":"Blog",name:"EOV6 Blog",description,url:"https://eov6.com/blog"};

  return (
    <>
      <SEO title={title} description={description} url="https://eov6.com/blog" schema={schema} />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-3 text-slate-600">{description}</p>
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.slug} className="rounded-2xl border p-6 hover:shadow-sm">
              <time className="text-xs text-slate-500">{new Date(p.date).toDateString()}</time>
              <h2 className="mt-1 text-2xl font-semibold">
                <Link className="hover:underline" href={`/blog/${p.slug}`}>{p.title}</Link>
              </h2>
              <p className="mt-2 text-slate-600">{p.excerpt}</p>
              <div className="mt-3 text-blue-600 font-medium">Read →</div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
