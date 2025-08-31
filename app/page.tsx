// app/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // autofocus the field
    inputRef.current?.focus();
  }, []);

  function setFromPaste(v: string) {
    // Accept paste of full strings (e.g. “code 123456”), keep only first 6 digits
    const onlyDigits = (v.match(/\d/g) || []).join("").slice(0, 6);
    setCode(onlyDigits);
  }

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== 6 || submitting) return;
    setSubmitting(true);
    try {
      router.push(`/s/${code}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0b1220", color: "#e6eefb" }}
    >
      <div className="w-full max-w-xl px-6">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6">
          Join your secure session
        </h1>

        <p className="text-sm opacity-80 mb-8">
          Enter the 6-digit code your agent gave you. Data is cleared
          automatically by policy.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col items-center gap-6">
          {/* One big field with dashed placeholders */}
          <div className="w-full">
            <label htmlFor="code" className="sr-only">
              6 digit code
            </label>

            <input
              id="code"
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setFromPaste(e.target.value)}
              onKeyDown={(e) => {
                // Enter submits
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="
                w-full text-center tracking-[0.35em]
                rounded-2xl bg-[#0f172a] border border-[#1e2a44]
                focus:border-[#4aa8ff] outline-none
                placeholder-[#33415f]
                mx-auto
              "
              // BIG type scale
              style={{
                fontSize: "2.25rem", // ~36px
                lineHeight: "3rem",
                padding: "1.25rem 1rem",
                color: "#e6eefb",
              }}
              placeholder="— — — — — —"
              aria-label="6 digit code"
            />

            <div className="mt-2 text-xs opacity-70 text-center">
              Tip: you can paste a full code; we’ll format it automatically.
            </div>
          </div>

          {/* Primary action */}
          <button
            type="submit"
            disabled={code.length !== 6 || submitting}
            className="
              w-full md:w-64 rounded-2xl py-3 text-base font-medium
              bg-[#3b82f6] text-white disabled:opacity-40
              hover:bg-[#2563eb] transition
            "
          >
            {submitting ? "Joining…" : "Join"}
          </button>

          {/* Secondary actions */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/marketing"
              className="
                flex-1 md:flex-none text-center rounded-2xl py-3
                bg-[#1b253d] text-[#e6eefb] hover:bg-[#1f2b48] transition
              "
            >
              Learn about EOV6
            </Link>

            <Link
              href="/ivr"
              className="
                flex-1 md:flex-none text-center rounded-2xl py-3
                bg-[#1b253d] text-[#e6eefb] hover:bg-[#1f2b48] transition
              "
            >
              IVR instructions
            </Link>
          </div>

          {/* tiny watermark to confirm deploy */}
          <div className="text-[10px] opacity-50 mt-2 text-center">
            ui-polish • one-field-six • {new Date().toISOString().slice(0, 10)}
          </div>
        </form>
      </div>
    </main>
  );
}
