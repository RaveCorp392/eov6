// types/policy.ts
export type PolicyConfig = {
  required: boolean;
  version: string;           // e.g. "2025-09-07.1"
  title: string;
  linkUrl?: string;
  statementText: string;     // plain text; render as pre-wrap
  retainConsentAuditDays?: number; // 0 = ephemeral only; >0 = keep copies in /consent_audit
};

export type PolicySnapshot = PolicyConfig & {
  snapAt: any;               // Firestore Timestamp (typed as any to avoid SDK cross-imports)
  orgId: string;
};

export type ConsentRecord = {
  accepted: boolean;
  version: string;
  role: 'caller' | 'agent';
  at: any;                   // Firestore Timestamp
  ipHash?: string;
  ua?: string;               // user agent snippet
};
