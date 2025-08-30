"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  onComplete: (code: string) => void;
  autoFocus?: boolean;
  ariaLabel?: string;
};

export default function NumberInput6({ onComplete, autoFocus, ariaLabel }: Props) {
  const [value, setValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const cells = useMemo(() => {
    const out = new Array(6).fill("");
    for (let i = 0; i < Math.min(value.length, 6); i++) out[i] = value[i];
    return out;
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === 6) onComplete(value);
  }, [value, onComplete]);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label={ariaLabel ?? "6 digit code input"}
    >
      {/* visually-hidden input, controls state; numeric keypad on mobile */}
      <input
        ref={inputRef}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        className="absolute inset-0 opacity-0 pointer-events-none"
        value={value}
        onChange={(e) => {
          const digits = (e.target.value || "").replace(/\D+/g, "").slice(0, 6);
          setValue(digits);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && value.length > 0) {
            e.preventDefault();
            setValue(value.slice(0, -1));
          }
        }}
      />

      <div className="grid grid-cols-6 gap-2">
        {cells.map((c, i) => {
          const isActive = i === value.length;
          return (
            <div
              key={i}
              className={[
                "h-12 sm:h-14 rounded-xl border flex items-center justify-center text-xl sm:text-2xl font-medium",
                "transition-colors",
                c
                  ? "border-slate-500 bg-slate-800"
                  : isActive
                  ? "border-indigo-400 bg-slate-900"
                  : "border-slate-700 bg-slate-900",
              ].join(" ")}
              aria-live="polite"
              aria-label={`Digit ${i + 1}`}
            >
              {c || ""}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Only numbers • Your code expires automatically
      </p>
    </div>
  );
}
