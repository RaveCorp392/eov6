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

/** Default numeric code length (kept for IVR/marketing usage). */
export const defaultCodeLength = 6;

/** Compute an absolute Date for a TTL of N hours from now. */
export function expiryInHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Generate a numeric session code, no leading zero. */
export function randomCode(len = defaultCodeLength): string {
  if (len <= 0) return "0";
  let s = String(1 + Math.floor(Math.random() * 9)); // first digit 1..9
  for (let i = 1; i < len; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}
