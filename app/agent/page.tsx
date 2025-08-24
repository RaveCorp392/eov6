// app/agent/page.tsx
"use client";

import Link from "next/link";
import NewSessionButton from "@/components/NewSessionButton";

export default function AgentHome() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agent console</h1>
        <div className="flex gap-2">
          <Link
            href="/marketing"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Marketing
          </Link>
          {/* You can keep your existing Sign out control in layout/header */}
        </div>
      </header>

      <section className="mt-10 rounded-xl border border-slate-200 p-6">
        <p className="text-slate-700">
          Create a one-time code and share it with the caller to collect name,
          email, and phone securely. Sessions auto-expire per policy.
        </p>
        <div className="mt-6">
          <NewSessionButton emphasize />
        </div>
      </section>
    </main>
  );
}
