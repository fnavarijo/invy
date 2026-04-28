'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Cambiar tema"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}

export function NavbarActions() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  if (!isSignedIn) return null;

  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <button
        onClick={() => signOut({ redirectUrl: '/auth/login' })}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
