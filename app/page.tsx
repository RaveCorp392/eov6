"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEFAULT_LEN =
  Number(process.env.NEXT_PUBLIC_CODE_LENGTH ?? 6) || 6;

// Allows prefixes like “SQ” plus digits, strips spaces and dashes
function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const cleaned = normalizeCode(code);
  const canJoin = cleaned.length >= DEFAULT_LEN; // allow prefixed codes

  function join() {
    if (!canJoin) return;
    router.push(`/s/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="mx-auto max-w-xl px-4 pt-28 pb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Join your secure session
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the code your agent gave you. Data is cleared automatically by
          policy.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") join();
            }}
            placeholder={`Enter code (e.g. 482957 or SQ482957)`}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          />
          <button
            onClick={join}
            disabled={!canJoin}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm transition enabled:hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join
          </button>
        </div>

        <div className="mt-10 text-sm text-slate-600">
          Would you like to know more?{" "}
          <Link href="/marketing" className="text-indigo-700 underline">
            Learn about EOV6
          </Link>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Agents: go to{" "}
          <Link href="/agent" className="text-indigo-700 underline">
            /agent
          </Link>{" "}
          to create a session code.
        </div>
      </section>
    </main>
  );
}
