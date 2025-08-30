"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  autoFocus?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
};

export default function NumberInput6({
  autoFocus = true,
  ariaLabel = "6 digit code",
  onChange,
  onComplete,
}: Props) {
  const length = 6;
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const value = useMemo(() => digits.join(""), [digits]);

  // autofocus first cell
  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0]!.focus();
      inputsRef.current[0]!.select();
    }
  }, [autoFocus]);

  // announce changes
  useEffect(() => {
    onChange?.(value);
    if (value.length === length) onComplete?.(value);
  }, [value, length, onChange, onComplete]);

  function setAt(i: number, v: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i]}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, v);
            if (v && i < length - 1) inputsRef.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              inputsRef.current[i - 1]?.focus();
              setAt(i - 1, "");
            }
            if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) inputsRef.current[i + 1]?.focus();
          }}
          className="w-12 h-14 text-center text-2xl rounded-xl bg-[#101827] border border-white/10 text-white outline-none focus:border-white/30"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
