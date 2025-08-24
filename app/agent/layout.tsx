import AgentAuthGate from "@/components/AgentAuthGate";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentAuthGate>{children}</AgentAuthGate>;
}

