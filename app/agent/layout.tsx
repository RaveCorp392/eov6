import type { ReactNode } from "react";
import AgentAuthGate from "@/components/AgentAuthGate";
import { AgentMembershipProvider } from "@/lib/agent-membership";

export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <AgentAuthGate>
      <AgentMembershipProvider>{children}</AgentMembershipProvider>
    </AgentAuthGate>
  );
}
