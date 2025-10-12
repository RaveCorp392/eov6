"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Report the render error
  Sentry.captureException(error);

  return (
    <html>
      <body className="p-6">
        <h2 className="text-lg font-semibold">Something went wrong.</h2>
        <p className="text-sm text-slate-600">We’ve logged the error for review.</p>
        <button
          className="mt-3 rounded bg-cyan-600 px-3 py-1.5 text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
