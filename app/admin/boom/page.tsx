"use client";
export default function Boom() {
  return (
    <main className="mx-auto max-w-lg p-8 space-y-4">
      <h1 className="text-lg font-semibold">Sentry Client Smoke</h1>
      <button
        className="rounded px-4 py-2 bg-cyan-600 text-white"
        onClick={() => {
          const fakePath = "/s/123456";
          // eslint-disable-next-line no-throw-literal
          throw { name: "SENTRY_TEST_CLIENT_ERROR", message: "client smoke", path: fakePath };
        }}
      >
        Trigger client error
      </button>
    </main>
  );
}
