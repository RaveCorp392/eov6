import { Timestamp } from "firebase/firestore";

/** Length of numeric session codes unless overridden via env. */
export const defaultCodeLength: number = Number.isFinite(
  Number(process.env.NEXT_PUBLIC_CODE_LENGTH)
)
  ? Number(process.env.NEXT_PUBLIC_CODE_LENGTH)
  : 6;

/** Generate a zero-prefixed numeric code (e.g., "034921"). */
export function randomCode(len: number = defaultCodeLength): string {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/** TTL helper: now + h hours, as a Firestore Timestamp. */
export function expiryInHours(h: number): Timestamp {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return Timestamp.fromDate(d);
}

/**
 * Chat message model.
 * Either a text message, a file message, or both (e.g., file + caption).
 * All file* fields are optional so existing text-only messages still type-check.
 */
export type Msg = {
  from: "agent" | "caller";
  at: Timestamp;

  // text payload
  text?: string;

  // file payload (optional)
  fileUrl?: string;   // public download URL or signed URL
  fileName?: string;  // original filename
  fileType?: string;  // MIME type, e.g. "image/png", "application/pdf"
  fileSize?: number;  // bytes
};
