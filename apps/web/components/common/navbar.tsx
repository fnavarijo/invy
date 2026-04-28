import { Separator } from '@/components/ui/separator';
import { NavbarActions } from '@/components/common/navbar-actions';
import { InvyLogo } from '@/components/common/invy-logo';
import { NavLinks } from '@/components/common/nav-links';

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6"
        aria-label="Principal"
      >
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <InvyLogo size={28} />
          Invy
        </a>
        <Separator orientation="vertical" className="h-5" aria-hidden="true" />
        <NavLinks />
        <NavbarActions />
      </nav>
    </header>
  );
}
