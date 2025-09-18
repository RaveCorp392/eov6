// /lib/authz.ts
import { getUser } from '@/lib/auth'; // use your existing session helper

export async function requireOwner() {
  const user = await getUser(); // { email?: string } | null
  const owner = process.env.ADMIN_EMAIL?.toLowerCase();
  const ok = user?.email && owner && user.email.toLowerCase() === owner;
  return { ok, user };
}
