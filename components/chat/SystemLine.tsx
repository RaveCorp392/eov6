// components/chat/SystemLine.tsx
type ChatMsg = { id: string; text?: string };

export default function SystemLine({ m }: { m: ChatMsg }) {
  return <div className="my-1 px-3 py-1.5 text-sm text-slate-500">{m.text || "—"}</div>;
}
