// lib/code.ts
import { Timestamp } from "firebase/firestore";

export const defaultCodeLength: number = Number.isFinite(
  Number(process.env.NEXT_PUBLIC_CODE_LENGTH)
)
  ? Number(process.env.NEXT_PUBLIC_CODE_LENGTH)
  : 6;

export function randomCode(len: number = defaultCodeLength): string {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export function expiryInHours(h: number): Timestamp {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return Timestamp.fromDate(d);
}

export type Msg = {
  text: string;
  from: "caller" | "agent";
  at: Timestamp;
};

