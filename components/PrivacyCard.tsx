"use client";

import { useEffect, useState } from "react";

export default function PrivacyCard({ text, onDismiss }: { text: string; onDismiss?: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
  }, [text]);

  if (!text || !visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 shadow-sm"
    >
      <div className="text-sm">{text}</div>
      <div className="mt-2 text-right">
        <button
          type="button"
          onClick={() => { setVisible(false); onDismiss?.(); }}
          className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

