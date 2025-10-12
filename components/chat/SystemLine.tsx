import { LinkifiedText } from "@/lib/linkify";

// components/chat/SystemLine.tsx
type ChatMsg = { id: string; text?: string };

export default function SystemLine({ m }: { m: ChatMsg }) {
  const text = m.text ?? "-";
  return (
    <div className="my-1 px-3 py-1.5 text-sm text-slate-500">
      <LinkifiedText text={text} />
    </div>
  );
}