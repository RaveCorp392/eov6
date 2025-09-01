"use client";

import { useEffect, useState } from "react";
import { getCallerDetails } from "@/lib/firebase";

export default function AgentDetailsPanel({ sessionId }: { sessionId: string }) {
  const [details, setDetails] = useState<any>({});
  useEffect(() => {
    let live = true;
    (async () => {
      const d = await getCallerDetails(sessionId);
      if (live) setDetails(d);
    })();
    return () => {
      live = false;
    };
  }, [sessionId]);

  return (
    <div className="panel mb-4">
      <div className="mb-2 small">Caller details</div>
      {!details || Object.keys(details).length === 0 ? (
        <div className="small">No details yet.</div>
      ) : (
        <ul className="list-disc pl-5">
          {details.name && <li>{details.name}</li>}
          {details.email && <li>{details.email}</li>}
          {details.phone && <li>{details.phone}</li>}
        </ul>
      )}
    </div>
  );
}
