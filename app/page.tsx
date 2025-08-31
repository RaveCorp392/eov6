// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // autofocus when mounted
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalized = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(normalized(e.target.value));
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text');
    const next = normalized(pasted);
    if (next.length) {
      e.preventDefault();
      setCode(next);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length === 6) {
      // route to the caller session
      router.push(`/s/${code}`);
    }
  }

  const canJoin = code.length === 6;

  return (
    <main
      className="
        fixed inset-0           /* break out of any global layout quirks */
        flex items-center justify-center
        px-4
      "
    >
      <section className="w-full max-w-xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold">Join your secure session</h1>
        </header>

        <form onSubmit={onSubmit} className="w-full">
          {/* Input row */}
          <div className="w-full flex items-center justify-center gap-3">
            <input
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="6-digit code"
              placeholder="— — — — — —"
              value={code}
              onChange={onChange}
              onPaste={onPaste}
              className="
                block
                w-[360px] sm:w-[420px] max-w-full
                rounded-xl border border-white/20 bg-white/5
                px-4 py-4
                text-center text-2xl sm:text-3xl font-medium
                tracking-[0.45em] [letter-spacing:0.45em]
                caret-white
                placeholder:opacity-70 placeholder:text-center
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />

            <button
              type="submit"
              disabled={!canJoin}
              className="
                h-[56px]
                px-5 sm:px-6 rounded-xl
                text-base sm:text-lg font-semibold
                bg-blue-600 text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-blue-500 transition-colors
              "
            >
              Join
            </button>
          </div>

          {/* Helper text */}
          <p className="mt-3 text-center text-sm opacity-80">
            Enter the 6-digit code your agent gave you.
          </p>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/about"
              className="
                inline-flex items-center justify-center
                px-4 py-2 rounded-lg text-sm font-medium
                border border-white/20 bg-white/5 hover:bg-white/10 transition-colors
              "
            >
              Learn about EOV6
            </Link>

            <Link
              href="/ivr"
              className="
                inline-flex items-center justify-center
                px-4 py-2 rounded-lg text-sm font-medium
                border border-white/20 bg-white/5 hover:bg-white/10 transition-colors
              "
            >
              Use IVR instead
            </Link>
          </div>

          {/* Tip + watermark */}
          <div className="mt-6 text-center">
            <p className="text-sm opacity-70">
              Tip: you can paste the whole code — we’ll format it automatically.
            </p>
            <p className="mt-2 text-xs opacity-40">MW: root-join v3 • ui-polish</p>
          </div>
        </form>
      </section>
    </main>
  );
}
