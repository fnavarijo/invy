'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';

const DIRECTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'compras', label: 'Compras' },
  { value: 'ventas', label: 'Ventas' },
] as const;

type Direction = 'compras' | 'ventas' | undefined;

export function InvoiceDirectionFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (searchParams.get('direction') ?? undefined) as Direction;

  function select(value: Direction) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('direction', value);
    } else {
      params.delete('direction');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <ButtonGroup role="group" aria-label="Dirección de factura">
      {DIRECTIONS.map(({ value, label }) => {
        const isActive = current === value;
        return (
          <Button
            key={label}
            variant="outline"
            aria-pressed={isActive}
            onClick={() => select(value)}
            className={cn(
              isActive && 'bg-primary/10 font-medium text-primary hover:bg-primary/20 hover:text-primary',
            )}
          >
            {label}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
