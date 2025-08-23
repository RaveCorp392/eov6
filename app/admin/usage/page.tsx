export default function Usage(){
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4"><div className="text-sm text-gray-500">Sessions today</div><div className="text-2xl font-semibold">—</div></div>
        <div className="rounded-xl border p-4"><div className="text-sm text-gray-500">Avg duration</div><div className="text-2xl font-semibold">—</div></div>
        <div className="rounded-xl border p-4"><div className="text-sm text-gray-500">Agents active</div><div className="text-2xl font-semibold">—</div></div>
      </div>
      <p className="text-sm text-gray-500">(Hook up chart + metrics once Firestore is connected.)</p>
    </main>
  );
}
