import type { ReactNode } from "react";
import AgentAuthGate from "@/components/AgentAuthGate";

export default function AgentLayout({ children }: { children: ReactNode }) {
  return <AgentAuthGate>{children}</AgentAuthGate>;
}
