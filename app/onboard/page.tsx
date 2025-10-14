import { Suspense } from "react";
import dynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ClientOnboard = dynamic(() => import("./ClientOnboard"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <ClientOnboard />
    </Suspense>
  );
}
