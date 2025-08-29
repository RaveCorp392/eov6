// components/NumberInput6.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  autoFocus?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
};

export default function NumberInput6({
  autoFocus,
  ariaLabel = "6 digit code",
  onChange,
  onComplete,
}: Props) {
  const length = 6;
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const value = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    onChange?.(value);
    if (value.length === length) onComplete?.(value);
  }, [value, onChange, onComplete]);

  useEffect(() => {
    if (autoFocus && inputs.current[0]) inputs.current[0].focus();
  }, [autoFocus]);

  const setAt = (i: number, v: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    // allow navigation
    if (key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
      inputs.current[i - 1]?.select();
      return;
    }
    if (key === "ArrowRight" && i < length - 1) {
      inputs.current[i + 1]?.focus();
      inputs.current[i + 1]?.select();
      return;
    }
    if (key === "Backspace") {
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        inputs.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
      // prevent default so mobile keyboards don’t double-trigger
      e.preventDefault();
      return;
    }
    if (key === "Enter") {
      // if they press enter early, just bubble; the parent button handles it
      return;
    }
    // Only allow digits
    if (!/^\d$/.test(key)) {
      // Allow Tab
      if (key !== "Tab") e.preventDefault();
      return;
    }
    // place digit and move forward
    setAt(i, key);
    if (i < length - 1) {
      inputs.current[i + 1]?.focus();
      inputs.current[i + 1]?.select();
    }
    e.preventDefault();
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Accept paste of multiple digits
    if (raw.length > 1) {
      const only = raw.replace(/\D/g, "").slice(0, length);
      if (!only) return;
      const arr = Array(length).fill("");
      for (let j = 0; j < only.length; j++) arr[j] = only[j];
      setDigits(arr);
      const nextIndex = Math.min(only.length, length - 1);
      inputs.current[nextIndex]?.focus();
      inputs.current[nextIndex]?.select();
      return;
    }
    if (/^\d$/.test(raw)) {
      setAt(i, raw);
    } else if (raw === "") {
      setAt(i, "");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" aria-label={ariaLabel}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i] ?? ""}
          onKeyDown={(e) => handleKey(i, e)}
          onChange={(e) => handleChange(i, e)}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl tracking-widest rounded-lg border border-white/15 bg-white/5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={i === 0 ? ariaLabel : undefined}
        />
      ))}
    </div>
  );
}
