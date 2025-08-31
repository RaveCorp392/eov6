"use client";

import React from "react";
import ChatWindow from "@/components/ChatWindow";

type PageProps = { params: { code: string } };

export default function AgentConsolePage({ params }: PageProps) {
  const sessionCode = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] p-4">
      <h1 className="mb-1 text-xl font-semibold">Agent console</h1>
      <div className="mb-4 text-xs opacity-80">
        Session <strong>{sessionCode}</strong>
      </div>

      {/* Details + feed remain above (your existing details/feed UI). Replace your bottom input with ChatWindow. */}
      <section className="mt-6 h-[55vh]">
        <ChatWindow sessionCode={sessionCode} role="AGENT" />
      </section>
    </main>
  );
}
