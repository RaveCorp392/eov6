import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";

type PageProps = { params: { code: string } };

export default function AgentSessionPage({ params }: PageProps) {
  const { code } = params;
  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/90">Secure shared chat</h2>
        <ChatWindow code={code} role="agent" />
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="mb-2 text-sm font-semibold text-white/90">File upload (beta)</h3>
          <FileUploader code={code} role="agent" />
        </div>
      </aside>
    </main>
  );
}
