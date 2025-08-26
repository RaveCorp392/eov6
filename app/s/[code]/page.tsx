// app/s/[code]/page.tsx
import ChatWindow from "@/components/ChatWindow";
import UploadButton from "@/components/UploadButton";
import AgentDetailsPanel from "@/components/AgentDetailsPanel";

type PageProps = { params: { code: string } };

export default function CallerSessionPage({ params }: PageProps) {
  const code = params.code;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] shadow-lg shadow-black/30">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-white/90">
            Secure shared chat
          </h2>
          <p className="text-xs text-slate-400">
            Visible to agent & caller • Ephemeral: cleared when the session ends.
          </p>
        </div>

        <div className="p-4">
          <ChatWindow code={code} role="caller" />
        </div>
      </section>

      {/* Details + upload */}
      <aside className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-2 text-sm font-semibold text-white/90">Send your details</h3>
          <AgentDetailsPanel code={code} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <UploadButton code={code} role="caller" />
        </section>
      </aside>
    </main>
  );
}
