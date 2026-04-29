'use client';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';

interface LimitSelectorProps {
  options: readonly number[];
  current: number;
  onLimitSelect: (limit: number) => void;
}

export function LimitSelector({ options, current, onLimitSelect }: LimitSelectorProps) {
  return (
    <ButtonGroup role="group" aria-label="Resultados por página">
      {options.map((n) => (
        <Button
          key={n}
          variant="outline"
          aria-pressed={n === current}
          onClick={() => onLimitSelect(n)}
          className={cn(
            n === current &&
              'bg-primary/10 font-medium text-primary hover:bg-primary/20 hover:text-primary',
          )}
        >
          {n}
        </Button>
      ))}
    </ButtonGroup>
  );
}
