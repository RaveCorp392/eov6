// app/agent/[code]/page.tsx
import ChatWindow from "@/components/ChatWindow";

type PageProps = {
  params: { code: string };
};

export default function AgentConsolePage({ params }: PageProps) {
  const sessionCode = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb]">
      <header className="px-6 py-4">
        <h1 className="text-xl font-semibold">Agent console</h1>
        <p className="text-white/60 text-sm mt-1">
          Session <strong className="text-white">{sessionCode}</strong>
        </p>
      </header>

      <section className="px-4 pb-10">
        {/* Chat box with bounded width + internal scroll handled inside ChatWindow */}
        <ChatWindow sessionCode={sessionCode} role="AGENT" />
      </section>
    </main>
  );
}
