import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";
import CallerDetailsForm from "@/components/CallerDetailsForm";

type PageProps = { params: { code: string } };

export default function CallerPage({ params }: PageProps) {
  const code = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] p-4 sm:p-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Secure shared chat</h1>
        <p className="mt-1 text-xs opacity-70">Visible to agent &amp; caller · Ephemeral when session ends</p>
      </header>

      {/* details + small attach button — same width as chat, centered */}
      <section className="flex justify-center">
        <div style={{ width: "100%", maxWidth: "560px" }}>
          <CallerDetailsForm code={code} showIdentityFields showNotes={false} submitLabel="Save details" actor="CALLER" />
          <div className="mt-2" style={{ display: "flex", justifyContent: "flex-end" }}>
            <FileUploader code={code} role="caller" enabled />
          </div>
        </div>
      </section>

      {/* chat centered */}
      <section className="mt-4 flex justify-center">
        <ChatWindow sessionCode={code} role="CALLER" />
      </section>
    </main>
  );
}
