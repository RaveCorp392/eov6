"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ensureMembership } from "@/lib/membership";
import { devlog } from "@/lib/devlog";

type AgentMembership = {
  membershipReady: boolean;
  orgId?: string;
  role?: string;
};

const Ctx = createContext<AgentMembership>({ membershipReady: false });

export function AgentMembershipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AgentMembership>({ membershipReady: false });

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) {
        setState({ membershipReady: false });
        return;
      }
      const boot = await ensureMembership();
      devlog("bootstrap-context", boot);
      if (boot.ok) {
        setState({ membershipReady: true, orgId: boot.orgId, role: boot.role });
      } else {
        setState({ membershipReady: false });
      }
    });
    return () => off();
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useAgentMembership() {
  return useContext(Ctx);
}

