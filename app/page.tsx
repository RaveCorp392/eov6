"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const [code, setCode] = useState("");
  const r = useRouter();

  function formatSix(val: string) {
    return val.replace(/\D/g, "").slice(0, 6);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(formatSix(e.target.value));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const c = formatSix(code);
    if (c.length === 6) r.push(`/s/${c}`);
  }

  const placeholder = "－ － －  － － －"; // visual clue of 6 digits

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1220] text-[#e6eefb]">
      <form onSubmit={onSubmit} className="w-full max-w-md text-center">
        <h1 className="mb-6 text-2xl font-semibold">Join your secure session</h1>

        <label className="mb-2 block text-sm text-white/70" htmlFor="code">
          Enter the 6-digit code your agent gave you.
        </label>

        <input
          id="code"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={code}
          onChange={onChange}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-center text-3xl tracking-[0.4em] placeholder:tracking-[0.25em] placeholder:text-white/30 focus:outline-none"
          placeholder={placeholder}
          aria-label="6 digit code"
        />

        <button
          type="submit"
          disabled={code.length !== 6}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-white disabled:opacity-40"
        >
          Join
        </button>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <a href="/about" className="underline">Learn about EOV6</a>
          <div className="flex gap-3">
            <a href="/ivr" className="rounded-lg border border-white/15 px-3 py-2 underline">
              Use IVR instead
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-white/40">Tip: you can paste the whole code — we’ll format it automatically.</p>
      </form>
    </main>
  );
}
