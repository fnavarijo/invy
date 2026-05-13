'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Landmark, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NitItem } from '@/components/dashboard/issuer-filter';

interface NitPrincipalFilterProps {
  items: NitItem[];
}

export function NitPrincipalFilter({ items }: NitPrincipalFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeNit = searchParams.get('nit_principal');
  const activeItem = items.find((i) => i.nit === activeNit) ?? null;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.nit.includes(search),
      )
    : items;

  function select(nit: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nit) {
      params.set('nit_principal', nit);
    } else {
      params.delete('nit_principal');
      params.delete('direction');
    }
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'gap-1.5',
            activeItem ? 'rounded-r-none border-r-0 text-foreground' : 'text-muted-foreground',
          )}
        >
          <Landmark className="size-3.5 shrink-0" />
          <span className="max-w-45 truncate">
            {activeItem ? activeItem.name : 'Seleccionar NIT'}
          </span>
          <ChevronDown className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')} />
        </Button>

        {activeItem && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => select(null)}
            aria-label="Quitar NIT principal"
            className="rounded-l-none"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa o NIT..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border-t border-border">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.nit}
                    onClick={() => select(item.nit)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-primary/10',
                      activeNit === item.nit && 'bg-primary/10 text-primary',
                    )}
                  >
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <span className="font-mono text-sm text-muted-foreground">{item.nit}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
