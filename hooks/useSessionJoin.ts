"use client";
import { useEffect, useState } from "react";
export type JoinErr = "already_joined" | "expired" | "closed" | "invalid_code" | "join_failed" | null;

export function useSessionJoin(code: string): JoinErr {
  const [err, setErr] = useState<JoinErr>(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/sessions/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          if (!cancel) setErr((j?.error as JoinErr) || "join_failed");
        }
      } catch {
        if (!cancel) setErr("join_failed");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [code]);
  return err;
}
