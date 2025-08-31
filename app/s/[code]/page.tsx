"use client";

import React from "react";
import ChatWindow from "@/components/ChatWindow";

type PageProps = { params: { code: string } };

export default function CallerSessionPage({ params }: PageProps) {
  const sessionCode = params.code;

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e6eefb] p-4">
      <h1 className="mb-1 text-xl font-semibold">Secure shared chat</h1>
      <p className="mb-4 text-xs opacity-75">
        Visible to agent & caller · Ephemeral: cleared when the session ends.
      </p>

      <section className="h-[70vh]">
        <ChatWindow sessionCode={sessionCode} role="CALLER" />
      </section>
    </main>
  );
}
