import { Separator } from '@/components/ui/separator';

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6"
        aria-label="Main"
      >
        <a
          href="/"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Invy
        </a>
        <Separator orientation="vertical" className="h-4" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Invoice Processing</p>
      </nav>
    </header>
  );
}
