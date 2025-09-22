// components/chat/SystemLine.tsx
type Msg = { id: string; text?: string };

export default function SystemLine({ m }: { m: Msg }) {
  return <div className="my-1 px-3 py-1.5 text-sm text-slate-500">{m.text || "—"}</div>;
}
