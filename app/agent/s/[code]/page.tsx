import ChatWindow from "@/components/ChatWindow";
import CallerDetailsForm from "@/components/CallerDetailsForm";
import DetailsHeader from "@/components/DetailsHeader";

type PageProps = { params: { code: string } };

export default function AgentSessionPage({ params }: PageProps) {
  const code = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] p-4 sm:p-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Agent console</h1>
        <div className="mt-1 text-xs opacity-70">Session <strong className="font-semibold">{code}</strong></div>
      </header>

      {/* Read-only caller info centered and width-matched */}
      <DetailsHeader code={code} />

      {/* Chat centered */}
      <section style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <ChatWindow sessionCode={code} role="AGENT" />
      </section>

      {/* Notes centered and width-matched */}
      <section style={{ display: "flex", justifyContent: "center" }}>
        <CallerDetailsForm
          code={code}
          showIdentityFields={false}
          showNotes
          submitLabel="Save notes"
          actor="AGENT"
        />
      </section>
    </main>
  );
}
