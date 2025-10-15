'use client';

import { useEffect } from 'react';
import { setUtmCookieFromUrl } from '@/lib/utm';

export default function UtmCookieBoot() {
  useEffect(() => {
    setUtmCookieFromUrl();
  }, []);
  return null;
}
