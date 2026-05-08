'use client';

import { usePathname } from 'next/navigation';

import { CookieBanner } from './CookieBanner';
import { Footer } from './Footer';
import { Header } from './Header';

function isRhRoute(pathname: string | null): boolean {
  return Boolean(pathname && (pathname === '/rh' || pathname.startsWith('/rh/')));
}

export function PublicHeader() {
  const pathname = usePathname();
  if (isRhRoute(pathname)) return null;
  return <Header />;
}

export function PublicFooter() {
  const pathname = usePathname();
  if (isRhRoute(pathname)) return null;
  return <Footer />;
}

export function PublicCookieBanner() {
  const pathname = usePathname();
  if (isRhRoute(pathname)) return null;
  return <CookieBanner />;
}
