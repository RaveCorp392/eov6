import ChatWindow from "@/components/ChatWindow";
import CallerDetailsForm from "@/components/CallerDetailsForm";
import FileUploader from "@/components/FileUploader";

type PageProps = {
  params: { code: string };
};

export default function CallerSessionPage({ params: { code } }: PageProps) {
  return (
    <main className="mx-auto max-w-5xl p-4 space-y-6">
      {/* Transcript */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
        <ChatWindow code={code} role="caller" />
      </section>

      {/* Caller-only tools */}
      <aside className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <CallerDetailsForm code={code} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
          <h3 className="text-sm font-semibold text-white/90">File upload (beta)</h3>
          <FileUploader code={code} role="caller" />
        </div>
      </aside>
    </main>
  );
}
