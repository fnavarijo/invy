'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { type LucideIcon, Building2, User, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface NitItem {
  nit: string;
  name: string;
}

interface NitFilterProps {
  paramKey: string;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  items: NitItem[];
}

function NitFilter({ paramKey, label, placeholder, icon: Icon, items }: NitFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeNit = searchParams.get(paramKey);
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
      params.set(paramKey, nit);
    } else {
      params.delete(paramKey);
    }
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30',
            activeItem ? 'rounded-r-none border-r-0 text-foreground' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="max-w-[160px] truncate">
            {activeItem ? activeItem.name : label}
          </span>
          <ChevronDown className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>

        {activeItem && (
          <button
            onClick={() => select(null)}
            aria-label={`Quitar filtro de ${label.toLowerCase()}`}
            className="inline-flex h-8 items-center rounded-r-md border border-border bg-background px-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <X className="size-3.5" />
          </button>
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
                placeholder={placeholder}
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

export function IssuerFilter({ items }: { items: NitItem[] }) {
  return (
    <NitFilter
      paramKey="issuer_nit"
      label="Emisor"
      placeholder="Buscar emisor o NIT..."
      icon={Building2}
      items={items}
    />
  );
}

export function ClientFilter({ items }: { items: NitItem[] }) {
  return (
    <NitFilter
      paramKey="client_nit"
      label="Cliente"
      placeholder="Buscar cliente o NIT..."
      icon={User}
      items={items}
    />
  );
}
