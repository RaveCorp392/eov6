// Shared utilities & types used by pages/components

export type Msg = {
  from: "caller" | "agent";
  at: any;               // Firestore Timestamp | FieldValue
  text?: string;
  file?: {
    url: string;
    name: string;
    size: number;        // bytes
    type: string;        // mime
    path?: string;       // storage path (optional, for debugging)
  };
};

export const defaultCodeLength = 6;

export function randomCode(len: number = defaultCodeLength) {
  const digits = "0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += digits[Math.floor(Math.random() * digits.length)];
  return s;
}

// Firestore Timestamp in the future (client-side). Firestore will store as a timestamp.
export function expiryInHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function formatKB(bytes: number) {
  return `${Math.ceil(bytes / 1024)} KB`;
}
