// app/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [val, setVal] = useState("");
  const router = useRouter();

  const digits = useMemo(
    () => val.replace(/\D/g, "").slice(0, 6),
    [val]
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (digits.length === 6) {
      router.push(`/s/${digits}`);
    }
  }

  const placeholder = "— — — — — —";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1220] text-[#e6eefb]">
      <div className="w-full max-w-[640px] px-6 py-12">
        <h1 className="text-center text-2xl font-semibold mb-6">
          Join your secure session
        </h1>

        <form onSubmit={onSubmit} className="flex flex-col items-center gap-4">
          <label htmlFor="code" className="sr-only">
            6-digit code
          </label>

          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoCorrect="off"
            autoFocus
            maxLength={12} // users can paste with spaces/dashes; we sanitize to 6 digits
            value={val}
            onChange={onChange}
            placeholder={placeholder}
            className="
              w-full max-w-[520px]
              text-center text-[40px] leading-[48px] tracking-[0.3em]
              px-5 py-4 rounded-2xl outline-none
              bg-[#0f1730] border border-white/15 focus:border-white/35
              placeholder-white/25
            "
          />

          <p className="text-sm text-white/60 text-center max-w-[520px]">
            Tip: you can paste the full code — we’ll format it automatically.
          </p>

          <button
            type="submit"
            disabled={digits.length !== 6}
            className="
              mt-2 w-full max-w-[520px]
              rounded-2xl px-5 py-3
              bg-blue-600 text-white font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-blue-500 transition
            "
          >
            Join
          </button>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-[520px]">
            <a
              href="/about"
              className="flex-1 rounded-2xl px-5 py-3 text-center border border-white/15 hover:border-white/35 transition"
            >
              Learn about EOV6
            </a>
            <a
              href="/ivr"
              className="flex-1 rounded-2xl px-5 py-3 text-center border border-white/15 hover:border-white/35 transition"
            >
              Use IVR instead
            </a>
          </div>

          <p className="mt-6 text-xs text-white/45 text-center">
            By continuing you agree to ephemeral retention and our acceptable use.
          </p>

          <p className="mt-2 text-[10px] text-white/30">MW: root-join v2 • ui-polish</p>
        </form>
      </div>
    </main>
  );
}
