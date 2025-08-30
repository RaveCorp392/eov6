// app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DIGITS = 6;

export default function HomeJoinPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [submitting, setSubmitting] = useState(false);

  // Build the code string
  const code = useMemo(() => digits.join(""), [digits]);

  // Focus the first box on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Helpers
  function setDigitAt(i: number, val: string) {
    const v = (val || "").replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const before = digits[i];
    setDigitAt(i, e.target.value);

    // Auto-advance when a new value is entered
    const now = e.target.value.replace(/\D/g, "");
    if (!before && now && i < DIGITS - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) {
        // Move back if current is empty
        inputsRef.current[i - 1]?.focus();
        setDigitAt(i - 1, "");
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < DIGITS - 1) {
      inputsRef.current[i + 1]?.focus();
      e.preventDefault();
    } else if (e.key === "Enter") {
      onSubmit();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const raw = e.clipboardData.getData("text") || "";
    const justDigits = raw.replace(/\D/g, "").slice(0, DIGITS);
    if (justDigits.length) {
      e.preventDefault();
      const next = Array(DIGITS).fill("");
      for (let i = 0; i < justDigits.length; i++) next[i] = justDigits[i];
      setDigits(next);
      // Focus last filled box (or the one after, if available)
      const idx = Math.min(justDigits.length, DIGITS - 1);
      inputsRef.current[idx]?.focus();
    }
  }

  async function onSubmit() {
    if (code.length !== DIGITS) return;
    try {
      setSubmitting(true);
      // Route to the session (your sessions live at /s/[code])
      router.push(`/s/${code}`);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = code.length === DIGITS && !submitting;

  return (
    <main
      onPaste={handlePaste}
      className="min-h-screen flex items-center justify-center bg-[#0b1220] text-[#e6eefb]"
    >
      <div className="w-full max-w-[720px] px-6">
        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
          Join your secure session
        </h1>
        <p className="text-sm opacity-80 mb-6">
          Enter the 6-digit code your agent gave you. Data is cleared automatically by policy.
        </p>

        {/* 6-digit input row */}
        <div className="flex items-center gap-2 mb-3" role="group" aria-label="6 digit code">
          {Array.from({ length: DIGITS }).map((_, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              value={digits[i]}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label={`Digit ${i + 1}`}
              maxLength={1}
              className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl rounded-md bg-white text-black
                         border border-[#1f2a44] focus:outline-none focus:ring-2 focus:ring-[#4c7dff]"
            />
          ))}
        </div>

        <p className="text-xs opacity-70 mb-6">
          Tip: you can paste a full code; we’ll format it automatically.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="px-5 py-2 rounded-md bg-[#4c7dff] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Joining…" : "Join"}
          </button>

          <a
            href="/investors"
            className="text-sm underline opacity-90 hover:opacity-100"
          >
            Learn about EOV6
          </a>

          <a
            href="/ivr"
            className="text-sm underline opacity-90 hover:opacity-100"
          >
            Agents: open Agent Console/IVR
          </a>
        </div>

        {/* Footer terms / watermark */}
        <div className="text-xs opacity-60 leading-relaxed space-y-1">
          <div>
            By continuing you agree to ephemeral retention and our acceptable use.
          </div>
          <div className="opacity-60">
            MW: root-join v1 • ui-polish
          </div>
        </div>
      </div>
    </main>
  );
}
