'use client';

import React from "react";

export function CancelFeedbackButton({ org, email, plan }: { org: string; email: string; plan?: string }) {
  const handleClick = React.useCallback(() => {
    const url = `/trial/feedback?org=${encodeURIComponent(org)}&email=${encodeURIComponent(email)}&plan=${encodeURIComponent(
      plan || "pro",
    )}`;
    window.location.href = url;
  }, [org, email, plan]);

  return (
    <button
      onClick={handleClick}
      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
      type="button"
    >
      Tell us why
    </button>
  );
}
