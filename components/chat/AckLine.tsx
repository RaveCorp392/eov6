// components/chat/AckLine.tsx
type ChatMsg = {
  id: string;
  text?: string;
  ack?: { id?: string; title?: string; status?: "accepted" | "declined" };
};

export default function AckLine({ m }: { m: ChatMsg }) {
  const slotTitle =
    m.ack?.id === "privacy" ? "Privacy acknowledgement" : m.ack?.title || "Acknowledgement";
  const status = m.ack?.status || (m.text?.includes("declined") ? "declined" : "accepted");
  const ok = status === "accepted";

  return (
    <div className="my-1 px-3 py-1.5 text-sm rounded-md border bg-white/70 text-slate-700 flex items-center gap-2">
      <span
        className={`inline-flex h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
        aria-hidden
      />
      <span className="font-medium">{slotTitle}</span>
      <span className={`ml-1 ${ok ? "text-emerald-700" : "text-rose-700"}`}>
        {ok ? "accepted" : "declined"}
      </span>
    </div>
  );
}
