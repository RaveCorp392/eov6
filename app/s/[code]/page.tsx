// app/s/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { watchSession } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AckModal from '@/components/AckModal';
import CallerDetailsForm from '@/components/CallerDetailsForm';

export default function CallerSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);

  useEffect(() => watchSession(code, setSession), [code]);

  const consentAccepted = Boolean(session?.consent?.accepted);
  const blocked = Boolean(session?.policySnapshot?.required) && !consentAccepted;

  return (
    <ConsentGate
      code={code}
      policy={session?.policySnapshot}
      consentAccepted={consentAccepted}
      role="caller"
    >
      <div className="mx-auto max-w-2xl p-4 space-y-3">
        <header className="mb-2 flex items-center justify-between">
          <div className="text-slate-600 dark:text-slate-300">EOV6 — Session {code}</div>
          <div className="text-xs text-slate-500">Ephemeral — clears on finish</div>
        </header>

        <CallerDetailsForm code={code} />

        <ChatWindow code={code} role="caller" disabled={blocked} showUpload />
        <AckModal sessionId={code} ackRequest={session?.ackRequest} />
      </div>
    </ConsentGate>
  );
}

