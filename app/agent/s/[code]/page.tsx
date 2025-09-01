import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";

type PageProps = {
  params: { code: string };
};

export default function AgentSessionPage({ params }: PageProps) {
  const sessionCode = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] p-4 sm:p-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Agent console</h1>
        <div className="mt-1 text-xs opacity-70">
          Session <strong className="font-semibold">{sessionCode}</strong>
        </div>
      </header>

      {/* Tools row (right-aligned). Keep this separate from ChatWindow props */}
      <div className="mb-3 flex justify-end">
        <FileUploader code={sessionCode} role="agent" enabled />
      </div>

      {/* Chat window */}
      <section>
        <ChatWindow sessionCode={sessionCode} role="AGENT" />
      </section>
    </main>
  );
}
