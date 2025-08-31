// app/s/[code]/page.tsx
import ChatWindow from "@/components/ChatWindow";

type PageProps = {
  params: { code: string };
};

export default function CallerConsolePage({ params }: PageProps) {
  const sessionCode = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb]">
      <header className="px-6 py-4">
        <h1 className="text-xl font-semibold">Secure shared chat</h1>
        <p className="text-white/60 text-sm mt-1">
          Visible to agent & caller • Ephemeral (cleared when session ends)
        </p>
      </header>

      <section className="px-4 pb-10">
        <ChatWindow sessionCode={sessionCode} role="CALLER" />
      </section>
    </main>
  );
}
