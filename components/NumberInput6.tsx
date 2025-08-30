"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  autoFocus?: boolean;
  ariaLabel?: string;          // Announced by screen readers
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
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // expose joined value
  const value = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    onChange?.(value);
    if (value.length === length && !value.includes("")) {
      onComplete?.(value);
    }
  }, [value, length, onChange, onComplete]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  function setAt(i: number, v: string) {
    setDigits((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    // Only allow digits 0–9; strip anything else.
    const raw = e.target.value;
    const onlyDigits = raw.replace(/\D+/g, "");

    // Support pasting multiple digits
    if (onlyDigits.length > 1) {
      const next = digits.slice();
      let idx = i;
      for (const ch of onlyDigits.split("").slice(0, length - i)) {
        next[idx] = ch;
        idx++;
      }
      setDigits(next);
      inputsRef.current[Math.min(i + onlyDigits.length, length - 1)]?.focus();
      return;
    }

    // Single char
    setAt(i, onlyDigits.slice(0, 1));
    if (onlyDigits && i < length - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        // clear current cell
        setAt(i, "");
      } else if (i > 0) {
        // move back and clear
        inputsRef.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && i < length - 1) {
      inputsRef.current[i + 1]?.focus();
      e.preventDefault();
    }
    if (e.key === "Enter" && value.length === length && !value.includes("")) {
      onComplete?.(value);
    }
  }

  return (
    <form
      className="flex flex-col items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.length === length && !value.includes("")) onComplete?.(value);
      }}
      aria-label={ariaLabel}
    >
      <div className="flex gap-2">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"     // mobile numeric keypad
            pattern="\d*"           // soft constraint for non-mobile
            autoComplete="one-time-code"
            className="h-12 w-12 rounded-xl bg-slate-800 text-slate-100 text-center text-xl
                       border border-slate-700 focus:border-blue-500 focus:outline-none
                       focus:ring-2 focus:ring-blue-500/30"
            value={digits[i]}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={value.length !== length}
            maxLength={1}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={value.length !== length || value.includes("")}
        className="rounded-xl bg-blue-600 px-4 py-2 text-white
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Join
      </button>
    </form>
  );
}
