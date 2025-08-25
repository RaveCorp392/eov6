import { Timestamp } from 'firebase/firestore';
export function expiryInHours(hours: number): Timestamp {
  const ms = Date.now() + hours * 60 * 60 * 1000;
  return Timestamp.fromDate(new Date(ms));
}
export type Msg = {
  id?: string;
  text?: string;
  from: 'agent' | 'caller' | 'system';
  at: any;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};
export function slugName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\.]+/g, '-').replace(/^-+|-+$/g, '');
}
