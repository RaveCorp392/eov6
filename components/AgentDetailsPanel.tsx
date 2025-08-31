'use client';

import React, { useEffect, useState } from 'react';
import { getCallerDetails } from '@/lib/firebase';

type Details = { name?: string; email?: string; phone?: string; notes?: string };

export default function AgentDetailsPanel({ sessionId }: { sessionId: string }) {
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const d = await getCallerDetails(sessionId) as Details | null;
        if (alive) setDetails(d);
      } catch { /* ignore */ }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [sessionId]);

  return (
    <section className="panel" style={{ width: 'min(36rem, 92vw)' }}>
      <h2 style={{ margin: '0 0 8px 0' }}>Caller details</h2>
      {!details ? (
        <div className="small">No details yet.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {details.name && <li><b>Name:</b> {details.name}</li>}
          {details.email && <li><b>Email:</b> {details.email}</li>}
          {details.phone && <li><b>Phone:</b> {details.phone}</li>}
          {details.notes && <li><b>Notes:</b> {details.notes}</li>}
        </ul>
      )}
    </section>
  );
}
