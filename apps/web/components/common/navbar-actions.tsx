'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';

export function NavbarActions() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  if (!isSignedIn) return null;

  return (
    <button
      onClick={() => signOut({ redirectUrl: '/auth/login' })}
      className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  );
}
