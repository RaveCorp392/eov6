// lib/auth.ts
// Minimal server-side auth helpers for gating Admin/Org pages.
// Dev-friendly: if no signed-in user is found, we fall back to ADMIN_EMAIL.

import { cookies } from 'next/headers';

export type AppUser = {
  uid: string;
  email: string;
  name?: string | null;
  admin: boolean;
};

// TODO: replace with real auth (Firebase/NextAuth/etc.)
export async function getUser(): Promise<AppUser | null> {
  // Dev hook: cookie "dev_user" with JSON:
  // { "uid":"u1", "email":"you@example.com", "name":"You" }
  const raw = cookies().get('dev_user')?.value;
  if (raw) {
    try {
      const d = JSON.parse(raw);
      const email: string | null = d?.email ?? null;
      if (email) {
        const admin =
          email.toLowerCase() === (process.env.ADMIN_EMAIL ?? '').toLowerCase();
        return {
          uid: (d?.uid as string) ?? 'dev',
          email,
          name: (d?.name as string) ?? null,
          admin,
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback: treat ADMIN_EMAIL as logged-in (dev only).
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    return { uid: 'admin', email: adminEmail, name: 'Admin', admin: true };
  }

  return null;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) throw new Error('Not signed in');
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await getUser();
  if (!user?.admin) throw new Error('Not authorized');
  return user;
}
