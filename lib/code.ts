import { Timestamp } from "firebase/firestore";

/** Chat message shape (text or file). */
export type Msg = {
  text?: string;
  from: "caller" | "agent";
  at: Timestamp;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

/** Compute an absolute Date for a TTL of N hours from now. */
export function expiryInHours(hours: number) {
  const now = Date.now();
  return new Date(now + hours * 60 * 60 * 1000);
}

/** Generate a 6-digit session code as a string (e.g. "493502"). */
export function randomCode(): string {
  // 100000..999999 (leading zeros avoided; matches the numeric codes you’ve been using)
  return String(Math.floor(100000 + Math.random() * 900000));
}
