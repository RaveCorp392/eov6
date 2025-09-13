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
    <div className="mb-3 grid gap-2 md:grid-cols-3">
      {(["name","email","phone"] as const).map((k) => (
        <label key={k} className="text-sm">
          <span className="block text-slate-600 dark:text-slate-300 capitalize">{k}</span>
          <input
            value={(form[k] as string) ?? ""}
            onChange={(e) => setForm((f) => ({...f, [k]: e.target.value}))}
            onBlur={(e) => saveField(k, e.target.value)}
            placeholder={k === "name" ? "Your name" : k === "email" ? "you@example.com" : "Optional"}
            className="w-full rounded-lg border border-slate-300 px-2 py-1"
          />
        </label>
      ))}
    </div>
  );
}

