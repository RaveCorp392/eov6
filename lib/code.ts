// lib/code.ts
// Shared helpers + types used across agent/caller UIs.

import { Timestamp } from 'firebase/firestore';

export type Msg = {
  id?: string;
  text?: string;
  from: 'agent' | 'caller' | 'system';
  at?: any;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

// Generate a Firestore Timestamp H hours from now (used for TTL)
export function expiryInHours(hours: number): Timestamp {
  const ms = Date.now() + hours * 60 * 60 * 1000;
  return Timestamp.fromDate(new Date(ms));
}

// File/name slug helper for upload object keys
export function slugName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\\.]+/g, '-').replace(/^-+|-+$/g, '');
}

// ----- Legacy/compat exports to satisfy existing imports -----
export const defaultCodeLength = 6;

export function randomCode(): string {
  // 6‑digit numeric code by default
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}
