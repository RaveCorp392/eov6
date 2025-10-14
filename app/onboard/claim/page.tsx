import { Suspense } from "react";
import NextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ClientClaim = NextDynamic(() => import("./ClientClaim"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <ClientClaim />
    </Suspense>
  );
}
