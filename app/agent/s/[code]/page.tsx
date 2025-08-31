// app/agent/s/[code]/page.tsx
import ChatWindow from "@/components/ChatWindow";
import { getCallerDetails } from "@/lib/firebase";

type PageProps = { params: { code: string } };

export default async function AgentConsolePage({ params }: PageProps) {
  const sessionId = params.code;
  const details = await getCallerDetails(sessionId);

  return (
    <main className="p-4">
      <h1 className="mb-1 text-xl font-semibold">Agent console</h1>
      <div className="small mb-4">Session <strong className="mono">{sessionId}</strong></div>

      <section className="flex gap-6 items-start">
        <div className="panel" style={{ maxWidth: 560 }}>
          <h2 className="mb-2 font-semibold">Caller details</h2>
          {details ? (
            <ul className="small" style={{ lineHeight: 1.6 }}>
              {details.name && <li><b>Name:</b> {details.name}</li>}
              {details.email && <li><b>Email:</b> {details.email}</li>}
              {details.phone && <li><b>Phone:</b> {details.phone}</li>}
              {details.uploadedUrl && (
                <li><b>Upload:</b> <a href={details.uploadedUrl}>view</a></li>
              )}
            </ul>
          ) : (
            <div className="small">No details yet.</div>
          )}
        </div>

        <ChatWindow sessionId={sessionId} role="AGENT" />
      </section>
    </main>
  );
}
