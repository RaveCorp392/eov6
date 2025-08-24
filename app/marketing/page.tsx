export const dynamic = "force-static";

import Link from "next/link";
import OnePager from "@/content/marketing/onepager.mdx";

export default function MarketingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Hero */}
      <section className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1">Ephemeral by default</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">Agent + Caller</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">TTL auto-deletes</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          EOV6 — Secure details, shared fast.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Agents get a short code, callers enter it at{" "}
          <span className="font-semibold">eov6.com</span>, and verified contact details arrive —
          then auto-expire by policy.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/agent"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Open agent console
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
          >
            Caller IVR / code entry
          </Link>
          <a
            href="mailto:partners@meetsafe.io"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
          >
            Contact us
          </a>
        </div>
      </section>

      {/* MDX One-pager (adds detail below the hero) */}
      <section className="mt-14">
        {/* If you use @tailwindcss/typography this will style MDX nicely.
           Without the plugin, it's harmless but has no effect. */}
        <div className="mx-auto max-w-3xl prose prose-slate">
          <OnePager />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EOV6. All rights reserved.
      </footer>
    </main>
  );
}
