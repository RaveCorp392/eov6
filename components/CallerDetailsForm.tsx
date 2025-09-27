"use client";

import { useEffect, useRef, useState } from "react";
import { watchDetails, saveDetails } from "@/lib/firebase";

type Details = { name?: string; email?: string; phone?: string; notes?: string };

export default function CallerDetailsForm({ code }: { code: string }) {
  const [form, setForm] = useState<Details>({});
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live hydrate from Firestore
  useEffect(() => {
    const unsub = watchDetails(code, (d) => {
      setForm((prev) => {
        // Only update fields that are actually different to avoid clobbering in-flight edits
        const next: Details = { ...prev };
        if (d?.name !== undefined && d?.name !== prev.name) next.name = d.name;
        if (d?.email !== undefined && d?.email !== prev.email) next.email = d.email;
        if (d?.phone !== undefined && d?.phone !== prev.phone) next.phone = d.phone;
        if (d?.notes !== undefined && d?.notes !== prev.notes) next.notes = d.notes;
        return next;
      });
    });
    return () => unsub();
  }, [code]);

  // Debounced full-save (captures browser autofill bursts)
  useEffect(() => {
    if (!code) return;
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      void saveDetails(code, {
        name: form.name?.trim() || "",
        email: form.email?.trim() || "",
        phone: form.phone?.trim() || "",
        notes: form.notes?.trim() || "",
      });
    }, 600);
    return () => {
      if (debTimer.current) clearTimeout(debTimer.current);
    };
  }, [code, form.name, form.email, form.phone, form.notes]);

  const setField =
    (key: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...form, [key]: e.target.value };
      setForm(next);
    };

  const blurSaveOne = async () => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      void saveDetails(code, {
        name: form.name?.trim() || "",
        email: form.email?.trim() || "",
        phone: form.phone?.trim() || "",
        notes: form.notes?.trim() || "",
      });
    }, 150);
  };

  return (
    <form
      autoComplete="on"
      onSubmit={(e) => e.preventDefault()}
      className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white/60 dark:bg-slate-900/60"
    >
      <div className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-300">Caller details</div>
      <div className="grid gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="caller-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Full name
          </label>
          <input
            id="caller-name"
            name="name"
            autoComplete="name"
            type="text"
            inputMode="text"
            autoCapitalize="words"
            placeholder="Full name"
            className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
            value={form.name || ""}
            onChange={setField("name")}
            onBlur={blurSaveOne}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="caller-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Email
          </label>
          <input
            id="caller-email"
            name="email"
            autoComplete="email"
            type="email"
            inputMode="email"
            placeholder="Email"
            className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
            value={form.email || ""}
            onChange={setField("email")}
            onBlur={blurSaveOne}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="caller-phone" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Phone
          </label>
          <input
            id="caller-phone"
            name="tel"
            autoComplete="tel"
            type="tel"
            inputMode="tel"
            placeholder="Phone"
            className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
            value={form.phone || ""}
            onChange={setField("phone")}
            onBlur={blurSaveOne}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="caller-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Notes
          </label>
          <textarea
            id="caller-notes"
            name="notes"
            autoComplete="on"
            rows={4}
            placeholder="Notes for the agent"
            className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
            value={form.notes || ""}
            onChange={setField("notes")}
            onBlur={blurSaveOne}
          />
        </div>
      </div>
    </form>
  );
}
