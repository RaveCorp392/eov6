// app/agent/s/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { watchSession } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AgentDetailsPanel from '@/components/AgentDetailsPanel';
import TranslateBanner from '@/components/TranslateBanner';

export default function AgentSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);

  useEffect(() => watchSession(code, setSession), [code]);

  const consentAccepted = Boolean(session?.consent?.accepted);

  return (
    <ConsentGate
      code={code}
      policy={session?.policySnapshot}
      consentAccepted={consentAccepted}
      role="agent"
    >
      <div className="mx-auto max-w-5xl p-4 space-y-3">
        <header className="mb-2 flex items-center justify-between">
          <div className="text-slate-600 dark:text-slate-300">Agent — Session {code}</div>
        </header>
        {session && <TranslateBanner session={session} />}

        <div className="grid md:grid-cols-[2fr_1fr] gap-4">
          <ChatWindow code={code} role="agent" showUpload={false} />
          <AgentDetailsPanel sessionId={code} />
        </div>
      </div>
    </ConsentGate>
  );
}
