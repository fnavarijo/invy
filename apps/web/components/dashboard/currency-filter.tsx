'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const CURRENCIES = [
  { value: 'GTQ', label: 'GTQ — Quetzal' },
  { value: 'USD', label: 'USD — Dólar' },
];

export function CurrencyFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCurrency = searchParams.get('currency') ?? 'GTQ';

  // Ensure currency is always present in the URL so other filters copy it on navigate
  useEffect(() => {
    if (!searchParams.get('currency')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('currency', 'GTQ');
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // run once on mount

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('currency', value);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent"
      >
        <span>{activeCurrency}</span>
        <ChevronDown className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {CURRENCIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => select(value)}
                className={cn(
                  'flex w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                  activeCurrency === value && 'bg-accent/60 font-medium',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
