// app/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalise to digits only, max 6
  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text");
    handleChange(txt);
    e.preventDefault();
    inputRef.current?.focus();
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length === 6) router.push(`/s/${code}`);
  }

  // Visual: entered digits + remaining dashes, spaced
  const display = useMemo(() => {
    const filled = code.split("");
    const remaining = Array(Math.max(0, 6 - filled.length)).fill("–"); // en dash
    const out = [...filled, ...remaining].join(" ");
    return out;
  }, [code]);

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
          Join your secure session
        </h1>
        <p className="text-sm opacity-80 mb-6">
          Enter the 6-digit code your agent gave you. Data is cleared
          automatically by policy.
        </p>

        {/* Single input with overlayed dashed display */}
        <form onSubmit={handleSubmit} className="mb-5">
          <div
            className="relative mx-auto"
            aria-label="Enter six digit code"
            role="group"
          >
            {/* Visible formatted layer */}
            <div
              className="select-none text-center font-mono tracking-[0.35em] sm:tracking-[0.45em] text-3xl sm:text-4xl leading-[1.1] py-4 px-4
                         rounded-2xl bg-[#0e1528] border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]
                         outline-none"
              onClick={() => inputRef.current?.focus()}
            >
              {display}
            </div>

            {/* Real input (transparent), captures typing/paste, mobile numeric keypad */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              aria-label="Six digit code"
              title="Six digit code"
              value={code}
              onChange={(e) => handleChange(e.target.value)}
              onPaste={handlePaste}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white
                         tracking-[0.35em] sm:tracking-[0.45em] text-3xl sm:text-4xl
                         rounded-2xl outline-none px-4 py-4"
            />
          </div>

          <div className="mt-3 text-xs opacity-70">
            Tip: you can paste a full code; we’ll format it automatically.
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={code.length !== 6}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>

            <button
              type="button"
              onClick={() => {
                setCode("");
                inputRef.current?.focus();
              }}
              className="text-sm opacity-80 hover:opacity-100 underline decoration-white/30"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Lightweight footer links */}
        <div className="text-sm space-y-2">
          <div>
            <a
              href="/marketing"
              className="text-[inherit] underline decoration-white/30 hover:opacity-100 opacity-80"
            >
              Learn about EOV6
            </a>
          </div>
          <div className="opacity-80">
            Agents: go to{" "}
            <a
              href="/agent"
              className="text-[inherit] underline decoration-white/30"
            >
              Agent Console
            </a>
            .
          </div>
          <div className="text-xs opacity-60">
            By continuing you agree to ephemeral retention and our acceptable
            use.
          </div>

          {/* Tiny watermark so we can verify the correct build */}
          <div className="text-[10px] opacity-50 pt-2">
            MW: root-join v2 • single-box • dashes
          </div>
        </div>
      </div>
    </main>
  );
}
