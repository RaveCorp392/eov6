"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type Props = { code: string };

export default function DetailsHeader({ code }: Props) {
  const [d, setD] = useState<{name?: string; phone?: string; email?: string; language?: string}>({});

  useEffect(() => {
    const ref = doc(db, "sessions", code, "details", "profile");
    const unsub = onSnapshot(ref, (snap) => {
      setD((snap.data() as any) || {});
    });
    return () => unsub();
  }, [code]);

  return (
    <div className="wrap">
      <div className="pill"><strong>Name:</strong>&nbsp;{d.name || "—"}</div>
      <div className="pill"><strong>Phone:</strong>&nbsp;{d.phone || "—"}</div>
      <div className="pill"><strong>Email:</strong>&nbsp;{d.email || "—"}</div>
      <div className="pill"><strong>Lang:</strong>&nbsp;{d.language || "—"}</div>

      <style jsx>{`
        .wrap {
          width: 100%;
          max-width: 560px;
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 10px;
        }
        @media (min-width: 1024px) { .wrap { max-width: 33vw; } }
        .pill {
          background: #0f172a; border: 1px solid #1e293b; border-radius: 999px;
          color: #e6eefb; padding: 6px 10px; font-size: 12px;
        }
      `}</style>
    </div>
  );
}
