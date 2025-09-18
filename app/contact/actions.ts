'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { redirect } from 'next/navigation';

export async function submitContact(formData: FormData) {
  const rawEmail = (formData.get('email') ?? '').toString().trim();
  const rawWebsite = (formData.get('website') ?? '').toString().trim();

  const email = rawEmail.toLowerCase();
  const website = rawWebsite || null;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    redirect('/contact?error=invalid_email');
  }

  // Firestore write (server-side via Admin SDK; security rules don’t apply)
  await adminDb.collection('contact_requests').add({
    email,
    website,
    source: 'contact_form',
    createdAt: Date.now(),
  });

  redirect('/contact?ok=1');
}
