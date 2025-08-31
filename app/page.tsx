'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [raw, setRaw] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep only digits, max 6
  const setDigits = (v: string) => {
    const digits = (v || '').replace(/\D/g, '').slice(0, 6);
    setRaw(digits);
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      setDigits(pasted);
    }
  };

  const join = () => {
    if (raw.length === 6) router.push(`/s/${raw}`);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      join();
    }
  };

  const disabled = raw.length !== 6;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1220] text-[#e6eefb]">
      <div className="w-full max-w-xl px-6 py-10 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6">Join your secure session</h1>

        {/* Big input box */}
        <div className="mb-3 flex justify-center">
          <input
            ref={inputRef}
            aria-label="6-digit code"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={raw}
            onChange={(e) => setDigits(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className="
              w-[20rem] md:w-[24rem]
              text-4xl md:text-5xl font-semibold tracking-[0.5em]
              text-[#e6eefb] placeholder-[#7f8aa3]
              text-center px-6 py-4
              rounded-2xl border border-white/20 bg-white/5
              outline-none focus:border-blue-400 focus:bg-white/[0.08]
              transition
            "
            placeholder="— — — — — —"
          />
        </div>

        {/* Helper/label under the box */}
        <p className="text-base md:text-lg text-[#b6c2df] mb-5">
          Enter the 6-digit code your agent gave you.
        </p>

        {/* Primary join button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={join}
            disabled={disabled}
            className={`
              inline-flex items-center justify-center
              rounded-xl px-6 py-3 text-base md:text-lg font-medium
              ${disabled
                ? 'bg-blue-500/30 text-white/50 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'}
              transition
            `}
          >
            Join
          </button>
        </div>

        {/* Secondary actions as actual buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push('/about')}
            className="rounded-xl px-4 py-2 border border-white/20 text-[#e6eefb] hover:bg-white/5 transition"
          >
            Learn about EOV6
          </button>
          <button
            type="button"
            onClick={() => router.push('/ivr')}
            className="rounded-xl px-4 py-2 border border-white/20 text-[#e6eefb] hover:bg-white/5 transition"
          >
            Use IVR instead
          </button>
        </div>

        {/* Tip */}
        <p className="text-sm text-[#8fa0c5]">
          Tip: you can paste the whole code — we’ll format it automatically.
        </p>

        {/* tiny watermark so we know the build is live */}
        <p className="mt-8 text-xs text-[#6d7aa0]">MW: root-join v3 • ui-polish</p>
      </div>
    </main>
  );
}
