"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [value, setValue] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // keep only digits, max 6
  function normalize(v: string) {
    return v.replace(/\D/g, "").slice(0, 6);
  }

  useEffect(() => {
    setValue((v) => normalize(v));
  }, []);

  useEffect(() => {
    if (value.length === 6) {
      // small delay so the last digit renders, then route
      const t = setTimeout(() => router.push(`/s/${value}`), 100);
      return () => clearTimeout(t);
    }
  }, [value, router]);

  const slots = useMemo(() => {
    const arr = new Array(6).fill("-");
    for (let i = 0; i < value.length; i++) arr[i] = value[i];
    return arr;
  }, [value]);

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] flex items-center justify-center p-4">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-2xl font-semibold mb-2">Join your secure session</h1>
        <p className="text-sm opacity-75 mb-8">
          Enter the 6-digit code your agent gave you.
        </p>

        {/* One big field with 6 visual slots */}
        <div className="relative mx-auto mb-3 w-full max-w-lg">
          {/* visual slots */}
          <div className="grid grid-cols-6 gap-2">
            {slots.map((ch, i) => (
              <div
                key={i}
                className="h-14 rounded-xl ring-1 ring-white/20 bg-[#0E1626] flex items-center justify-center text-2xl tracking-widest"
              >
                <span className={ch === "-" ? "opacity-30" : ""}>{ch}</span>
              </div>
            ))}
          </div>

          {/* real input (invisible) */}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(normalize(e.target.value))}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            aria-label="Enter 6 digit code"
            className="absolute inset-0 h-14 opacity-0"
            autoFocus
          />
          <p className="mt-2 text-xs opacity-60">Tip: you can paste a full code; we’ll format it automatically.</p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/about"
            className="inline-flex items-center justify-center rounded-xl bg-white/5 px-6 py-3 ring-1 ring-white/15 hover:bg-white/10"
          >
            Learn about EOV6
          </a>
          <a
            href="/ivr"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-500"
          >
            Use IVR instead
          </a>
        </div>

        <p className="mt-6 text-[11px] opacity-60">
          By continuing you agree to ephemeral retention and acceptable use.
        </p>

        {/* tiny watermark so we know it shipped */}
        <p className="mt-2 text-[11px] opacity-40">MW: root-join v2 • ui-polish</p>
      </div>
    </main>
  );
}
