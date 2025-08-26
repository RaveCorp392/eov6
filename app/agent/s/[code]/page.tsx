import ChatWindow from '@/components/ChatWindow';
import AgentDetailsPanel from '@/components/AgentDetailsPanel';
import FileUploader from '@/components/FileUploader';

type PageProps = {
  params: { code: string };
};

export default function AgentSessionPage({ params }: PageProps) {
  const { code } = params;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-white/90">Secure shared chat</h2>
            <p className="text-xs text-slate-400">
              Visible to agent & caller • Ephemeral: cleared when the session ends.
            </p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/70">
            Session {code}
          </span>
        </div>

        <ChatWindow code={code} role="agent" />
      </section>

      {/* Right column: details + tools */}
      <aside className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-2 text-sm font-semibold text-white/90">Caller details</h3>
          <AgentDetailsPanel code={code} />
        </div>

        <FileUploader code={code} role="agent" />
      </aside>
    </main>
  );
}
