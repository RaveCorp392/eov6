'use client';

import React from 'react';

export function TrialBanner({
  plan,
  endsAt
}: {
  plan?: 'trial' | 'pro' | 'none' | string;
  endsAt?: Date | string | null;
}) {
  if (plan !== 'trial') return null;
  const end = endsAt ? new Date(endsAt) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((+end - Date.now()) / 86_400_000)) : null;
  return (
    <div className='mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
      <b>Trial active.</b>{' '}
      {daysLeft !== null && (
        <>
          Ends in <b>{daysLeft} day{daysLeft === 1 ? '' : 's'}</b>.
        </>
      )}{' '}
      You can add teammates and run sessions normally. Billing will start automatically at the end of
      the trial.
    </div>
  );
}
