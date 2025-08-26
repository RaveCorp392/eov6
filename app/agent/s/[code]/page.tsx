// Agent console — two-pane layout (chat + caller details)
import type { Metadata } from "next";
import ChatWindow from "@/components/ChatWindow";
import AgentDetailsPanel from "@/components/AgentDetailsPanel";

export const metadata: Metadata = {
  title: "Agent console",
};

export default function AgentSessionPage({
  params: { code },
}: {
  params: { code: string };
}) {
  return (
    <main className="min-h-dvh bg-[#0b1220] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm/5 text-slate-300">Session</span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-sm/5 font-medium text-white">
              {code}
            </span>
          </div>
          <span className="text-xs text-slate-400">Ephemeral; clears on end</span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Chat / transcript */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] shadow-lg shadow-black/30">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Secure shared chat
            </h2>
            <p className="text-xs text-slate-400">Visible to agent & caller</p>
          </div>
          <div className="p-4">
            <ChatWindow code={code} role="agent" />
          </div>
        </section>

        {/* Caller details / tools */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
            <h3 className="mb-2 text-sm font-semibold text-white/90">
              Caller details
            </h3>
            <AgentDetailsPanel code={code} />
          </div>

          {/* Room for future widgets (recent uploads, flags, etc.) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
            <h3 className="mb-2 text-sm font-semibold text-white/90">
              Tools
            </h3>
            <p className="text-sm text-slate-400">
              Add quick actions here (verify, notes, tags).
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
