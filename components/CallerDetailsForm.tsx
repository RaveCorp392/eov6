// components/CallerDetailsForm.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { watchDetails, saveDetails } from '@/lib/firebase';

type Details = { name?: string; email?: string; phone?: string };

export default function CallerDetailsForm({ code }: { code: string }) {
  const [form, setForm] = useState<Details>({});
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // Live hydrate from Firestore
  useEffect(() => {
    const unsub = watchDetails(code, (d) => {
      setForm((prev) => {
        // Only update fields that are actually different to avoid clobbering in-flight edits
        const next: Details = { ...prev };
        if (d?.name !== undefined && d?.name !== prev.name) next.name = d.name;
        if (d?.email !== undefined && d?.email !== prev.email) next.email = d.email;
        if (d?.phone !== undefined && d?.phone !== prev.phone) next.phone = d.phone;
        return next;
      });
    });
    mounted.current = true;
    return () => unsub();
  }, [code]);

  // Debounced full-save (captures browser autofill bursts) - ESLint-friendly
  useEffect(() => {
    if (!code) return;
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      void saveDetails(code, {
        name: form.name?.trim() || '',
        email: form.email?.trim() || '',
        phone: form.phone?.trim() || '',
      });
    }, 600);
    return () => { if (debTimer.current) clearTimeout(debTimer.current); };
  }, [code, form.name, form.email, form.phone]);

  const setField = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
  };

  const blurSaveOne = async () => {
    // Ensure we don't drop the last field
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      void saveDetails(code, {
        name: form.name?.trim() || '',
        email: form.email?.trim() || '',
        phone: form.phone?.trim() || '',
      });
    }, 150);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white/60 dark:bg-slate-900/60">
      <div className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-300">Caller details</div>
      <div className="grid gap-2">
        <input
          autoComplete="name"
          placeholder="Full name"
          className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
          value={form.name || ''}
          onChange={setField('name')}
          onBlur={blurSaveOne}
        />
        <input
          autoComplete="email"
          placeholder="Email"
          className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
          value={form.email || ''}
          onChange={setField('email')}
          onBlur={blurSaveOne}
        />
        <input
          autoComplete="tel"
          placeholder="Phone"
          className="rounded-lg border px-3 py-2 bg-white/90 dark:bg-slate-900/70"
          value={form.phone || ''}
          onChange={setField('phone')}
          onBlur={blurSaveOne}
        />
      </div>
    </div>
  );
}
