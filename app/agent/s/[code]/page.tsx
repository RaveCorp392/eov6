import ChatWindow from "@/components/ChatWindow";
import AgentDetailsPanel from "@/components/AgentDetailsPanel";

type PageProps = {
  params: { code: string };
};

export default function AgentSessionPage({ params: { code } }: PageProps) {
  return (
    <main className="mx-auto max-w-5xl p-4 space-y-6">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <ChatWindow code={code} role="agent" />
      </section>

      {/* Caller details (read-only) */}
      <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <AgentDetailsPanel code={code} />
      </aside>

      {/* Note: no uploader on the agent side */}
    </main>
  );
}
