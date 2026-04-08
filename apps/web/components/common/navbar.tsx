import { Separator } from '@/components/ui/separator';
import { NavbarActions } from '@/components/common/navbar-actions';

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6"
        aria-label="Principal"
      >
        <a
          href="/"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Invy
        </a>
        <Separator orientation="vertical" className="h-4" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Procesamiento de Facturas</p>
        <Separator orientation="vertical" className="h-4" aria-hidden="true" />
        <a
          href="/batches"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Lotes
        </a>
        <NavbarActions />
      </nav>
    </header>
  );
}
