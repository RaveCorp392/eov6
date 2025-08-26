'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import AgentDetailsPanel from '@/components/AgentDetailsPanel';

export default function AgentSessionPage() {
  const params = useParams<{ code: string }>();
  const code = useMemo(() => `${params.code}`, [params.code]);

  return (
    <div className="flex">
      {/* Left: chat window (your existing chat UI goes here) */}
      <div className="flex-1 p-4">
        <div className="text-xs opacity-70 mb-2">🔒 Ephemeral: cleared when the session ends.</div>
        {/* … chat list + composer … */}
      </div>

      {/* Right: details panel subscribed to sessions/{code} */}
      <AgentDetailsPanel code={code} />
    </div>
  );
}
