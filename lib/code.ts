import { Timestamp } from "firebase/firestore";

export type Msg = {
  text?: string;
  from: "agent" | "caller";
  at: any; // Firestore Timestamp (kept loose for SSR/hydration)
  // Optional file payload for uploads
  file?: {
    url: string;
    name: string;
    size: number;
    type: string;
  };
};

export const defaultCodeLength = 6;

// TTL helper: now + N hours
export function expiryInHours(hours: number) {
  return Timestamp.fromDate(new Date(Date.now() + hours * 60 * 60 * 1000));
}

// Helper used by NewSessionButton (6-digit by default)
export function randomCode(len: number = defaultCodeLength): string {
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}
