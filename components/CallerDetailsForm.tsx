// components/CallerDetailsForm.tsx
"use client";
import { useEffect, useState } from "react";
import { saveDetails, watchDetails } from "@/lib/firebase";

export default function CallerDetailsForm({ code }: { code: string }) {
  const [form, setForm] = useState<{name?: string; email?: string; phone?: string}>({});

  useEffect(() => {
    return watchDetails(code, (d) => setForm({ name: d?.name || "", email: d?.email || "", phone: d?.phone || "" }));
  }, [code]);

  async function saveField<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    await saveDetails(code, { [k]: v } as any);
  }

  return (
    <form autoComplete="on" className="mb-3 grid gap-2 md:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
      <label className="text-sm">
        <span className="block text-slate-600 dark:text-slate-300">Name</span>
        <input
          name="name"
          autoComplete="name"
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onBlur={(e) => saveField("name", e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="text-sm">
        <span className="block text-slate-600 dark:text-slate-300">Email</span>
        <input
          name="email"
          autoComplete="email"
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          onBlur={(e) => saveField("email", e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="text-sm">
        <span className="block text-slate-600 dark:text-slate-300">Phone</span>
        <input
          name="tel"
          autoComplete="tel"
          inputMode="tel"
          value={form.phone ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          onBlur={(e) => saveField("phone", e.target.value)}
          placeholder="(555) 555-5555 (optional)"
          className="w-full rounded-lg border border-slate-300 px-2 py-1"
        />
      </label>
    </form>
  );
}
