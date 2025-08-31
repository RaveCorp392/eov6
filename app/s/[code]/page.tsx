// app/s/[code]/page.tsx
import ChatWindow from "@/components/ChatWindow";
import CallerDetailsForm from "@/components/CallerDetailsForm";

type PageProps = { params: { code: string } };

export default function CallerSessionPage({ params }: PageProps) {
  const sessionId = params.code;

  return (
    <main className="p-4">
      <h1 className="mb-1 text-xl font-semibold">Secure shared chat</h1>
      <div className="small mb-2">
        Visible to agent & caller • Ephemeral: cleared when the session ends.
      </div>

      <section className="flex gap-6 items-start">
        <CallerDetailsForm sessionId={sessionId} />
        <ChatWindow sessionId={sessionId} role="CALLER" />
      </section>
    </main>
  );
}
