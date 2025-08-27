// app/agent/s/[code]/page.tsx
"use client";

import type { FC } from "react";
import ChatWindow from "@/components/ChatWindow";
import AgentDetailsPanel from "@/components/AgentDetailsPanel";

type PageProps = {
  params: { code: string };
};

const AgentSessionPage: FC<PageProps> = ({ params }) => {
  const { code } = params;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/90">
          Secure shared chat
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Visible to agent & caller • Ephemeral: cleared when the session ends.
        </p>

        {/* Chat (agent view) */}
        <ChatWindow code={code} role="agent" />
      </section>

      {/* Caller details / tools */}
      <aside className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-2 text-sm font-semibold text-white/90">
            Caller details
          </h3>
          <AgentDetailsPanel code={code} />
        </div>

        {/* Room for future widgets (recent uploads, flags, quick actions) */}
      </aside>
    </main>
  );
};

export default AgentSessionPage;
