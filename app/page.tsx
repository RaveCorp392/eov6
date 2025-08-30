"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import NumberInput6 from "@/components/NumberInput6";

/**
 * Root join screen
 * - Centered 6-digit code entry (mobile numeric keypad via NumberInput6)
 * - Big, obvious primary action (auto-joins on 6 digits)
 * - Secondary links: Learn More, Agents, IVR
 * - Subtle watermark so we can verify the correct build is deployed
 */
export default function HomePage() {
  const router = useRouter();

  function handleComplete(code: string) {
    // Normalize and navigate to the session URL: /s/{code}
    const cleaned = (code || "").replace(/\D/g, "").slice(0, 6);
    if (cleaned.length === 6) router.push(`/s/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header / heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Join your secure session</h1>
          <p className="mt-2 text-sm opacity-80">
            Enter the 6-digit code your agent gave you. Data is cleared automatically by policy.
          </p>
        </div>

        {/* 6-digit code input */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 shadow-lg">
          <NumberInput6
            autoFocus
            ariaLabel="6 digit code"
            onComplete={handleComplete}
            onChange={() => {}}
          />
          <p className="mt-3 text-[13px] opacity-70 text-center">
            Tip: you can paste a full code; we’ll format it automatically.
          </p>
        </div>

        {/* Secondary links */}
        <div className="mt-8 grid grid-cols-1 gap-3">
          <Link
            href="/marketing"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 transition"
          >
            Learn about EOV6
          </Link>

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/agent"
              className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 transition"
            >
              Agents: open Agent Console
            </Link>
            <Link
              href="/ivr"
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              IVR
            </Link>
          </div>
        </div>

        {/* Footnotes */}
        <div className="mt-6 text-center text-xs opacity-70">
          By continuing you agree to ephemeral retention and our acceptable use.
        </div>
      </div>

      {/* Watermark to verify deployment */}
      <div className="fixed bottom-3 right-4 text-[10px] tracking-wide opacity-50 select-none">
        WM: root-join v1 • ui-polish
      </div>
    </main>
  );
}
