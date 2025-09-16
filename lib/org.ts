"use client";

// Minimal helper used by client components (e.g., AckMenu) to derive an org ID
// from a user email. This keeps things synchronous and lightweight. The
// Admin UI performs the full domain-to-org mapping via Firestore when needed.

export function orgIdFromEmail(email?: string | null): string {
  if (!email) return "default";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain || "default";
}

