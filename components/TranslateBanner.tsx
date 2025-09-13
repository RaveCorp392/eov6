"use client";
export default function TranslateBanner({ session }: { session: any }) {
  const t = session?.translate;
  if (!t?.enabled) return null;
  const a = String(t.agentLang || "en").toUpperCase();
  const c = String(t.callerLang || "en").toUpperCase();
  return (
    <div className="mb-2 rounded-md border bg-amber-50 text-amber-900 px-3 py-2 text-xs">
      <div className="font-medium">Live translation active · Agent {a} ↔ Caller {c}</div>
      <div className="opacity-75">Machine translation; accuracy may vary.</div>
    </div>
  );
}

