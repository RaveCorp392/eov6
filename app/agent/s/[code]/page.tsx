// app/agent/s/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { devlog } from '@/lib/devlog';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ensureMembership } from '@/lib/membership';
import { watchSession } from '@/lib/firebase';
import ConsentGate from '@/components/ConsentGate';
import ChatWindow from '@/components/ChatWindow';
import AgentDetailsPanel from '@/components/AgentDetailsPanel';
import { useAgentMembership } from '@/lib/agent-membership';
import TranslateBanner from '@/components/TranslateBanner';

export default function AgentSessionPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const [session, setSession] = useState<any>(null);
  const [membershipReady, setMembershipReady] = useState(false);
  const { orgId: ctxOrgId } = useAgentMembership();

  // Ensure membership so org reads don't 403 under rules
  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) return;
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/admin/ensure-membership', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
      } catch {}
    });
    return () => off();
  }, []);

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) return;
      const boot = await ensureMembership();
      devlog('bootstrap-session', boot);
      setMembershipReady(boot.ok);
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!membershipReady) return;
    return watchSession(code, setSession);
  }, [membershipReady, code]);

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
          <div className="text-slate-600 dark:text-slate-300">Agent - Session {code}</div>
        </header>
        {(() => { devlog('agent-session', { code, sessionOrgId: session?.orgId }); return null; })()}
        {!session?.orgId && (
          <div className="text-xs text-slate-500">Session created without orgId — please create a new session (v0.7.1+).</div>
        )}
        {session && <TranslateBanner session={session} />}

        <div className="grid md:grid-cols-[2fr_1fr] gap-4">
          <ChatWindow code={code} role="agent" showUpload={false} />
          <AgentDetailsPanel sessionId={code} membershipReady={membershipReady} />
        </div>
      </div>
    </ConsentGate>
  );
}
