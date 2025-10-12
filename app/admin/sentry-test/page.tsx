"use client";

import { useState } from "react";

export default function SentryClientTest() {
  const [clicked, setClicked] = useState(false);

  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Sentry Client Test</h1>
      <p className="text-sm text-slate-600">
        Click the button below to trigger a deliberate client-side error. Confirm it shows up in Sentry.
      </p>
      <button
        className="rounded-lg px-4 py-2 bg-cyan-600 text-white hover:bg-cyan-700"
        onClick={() => {
          setClicked(true);
          const fakePath = "/s/123456";
          // eslint-disable-next-line no-throw-literal
          throw {
            name: "SENTRY_TEST_CLIENT_ERROR",
            message: "Deliberate client error for Sentry smoke",
            path: fakePath,
          };
        }}
      >
        Trigger client error
      </button>
      {clicked && <p className="text-xs text-slate-500">If nothing happened, check your console.</p>}
    </main>
  );
}
