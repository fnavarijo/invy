'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/common/navbar';

const ROUTES_WITHOUT_NAVBAR = ['/auth/login'];

export function NavbarWrapper() {
  const pathname = usePathname();

  if (ROUTES_WITHOUT_NAVBAR.includes(pathname)) return null;

  return <Navbar />;
}
