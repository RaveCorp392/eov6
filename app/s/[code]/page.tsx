// Caller view — chat with “Send your details” and file upload sidebar
import type { Metadata } from "next";
import ChatWindow from "@/components/ChatWindow";
import FileUploader from "@/components/FileUploader";
// If you already have a component that writes name/email/phone to the session,
// import it here; otherwise replace the placeholder <SendDetailsForm/> below.
//
// Example (if exists):
// import SendDetailsForm from "@/components/SendDetailsForm";

export const metadata: Metadata = {
  title: "Secure shared chat",
};

export default function CallerSessionPage({
  params: { code },
}: {
  params: { code: string };
}) {
  return (
    <main className="min-h-dvh bg-[#0b1220] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span className="text-sm/5 text-slate-300">Session</span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-sm/5 font-medium text-white">
              {code}
            </span>
          </div>
          <span className="text-xs text-slate-400">Ephemeral; clears on end</span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Chat */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] shadow-lg shadow-black/30">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Secure shared chat
            </h2>
            <p className="text-xs text-slate-400">
              Your messages are visible to the agent assisting you.
            </p>
          </div>
          <div className="p-4">
            <ChatWindow code={code} role="caller" />
          </div>
        </section>

        {/* Sidebar: details + upload */}
        <aside className="space-y-6">
          {/* Send details */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
            <h3 className="mb-2 text-sm font-semibold text-white/90">
              Send your details
            </h3>

            {/* If you have a SendDetailsForm component, render it here:
                <SendDetailsForm code={code} />
               Otherwise, drop in your existing three-field form (name/email/phone)
               in place of the placeholder below. Keep the same handlers you already use.
            */}
            <form
              id="caller-details-form"
              className="space-y-3"
              // onSubmit={onSubmitDetails} // keep your existing handler here
            >
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full name"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <input
                  type="tel"
                  name="phone"
                  inputMode="tel"
                  placeholder="Phone"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <p className="text-xs text-slate-400">Only shared with this session</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  Send details
                </button>
              </div>
            </form>
          </div>

          {/* Upload */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-lg shadow-black/30">
            <h3 className="mb-2 text-sm font-semibold text-white/90">
              File upload <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">beta</span>
            </h3>
            <p className="mb-3 text-xs text-slate-400">
              Allowed: images &amp; PDF • Max 10&nbsp;MB
            </p>

            {/* Your uploader already handles progress & rules; we just style the container */}
            <FileUploader code={code} />
          </div>
        </aside>
      </div>
    </main>
  );
}
