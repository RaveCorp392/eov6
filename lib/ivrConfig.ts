// lib/ivrConfig.ts
export type OrgPolicy = {
  uploadsEnabled: boolean;      // org-level toggle
  maxUploadBytes: number;       // UI-enforced size cap (matches Storage rules)
};

export const orgPolicy: OrgPolicy = {
  uploadsEnabled: (process.env.NEXT_PUBLIC_UPLOADS_ENABLED ?? "0") === "1",
  maxUploadBytes: 10 * 1024 * 1024, // 10MB
};
