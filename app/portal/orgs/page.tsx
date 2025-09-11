// app/portal/orgs/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";

export const metadata = { title: "Organizations • EOV6" };

export default async function OrgsPage() {
  const snap = await adminDb.collection("orgs").orderBy("createdAt", "desc").limit(50).get();
  const orgs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Organizations</h1>
      <div className="grid gap-3">
        {orgs.map(o => (
          <div key={o.id} className="rounded border p-4">
            <div className="font-medium">{o.name || o.id}</div>
            <div className="text-sm text-gray-500">{o.domain || "-"}</div>
            <div className="text-xs text-gray-400 mt-1">
              Created: {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
            </div>
          </div>
        ))}
        {orgs.length === 0 && <div className="text-gray-500">No organizations yet.</div>}
      </div>
    </main>
  );
}
