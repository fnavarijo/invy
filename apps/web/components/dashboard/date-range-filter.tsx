'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DATE_PRESET_LABELS,
  type DatePreset,
  getPresetRange,
  toDateInputValue,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

const PRESETS: DatePreset[] = [
  'last-30-days',
  'this-month',
  'last-month',
  'last-3-months',
  'this-year',
];

function getActivePreset(from: string | null, to: string | null): DatePreset | 'custom' {
  if (!from || !to) return 'last-30-days';
  for (const preset of PRESETS) {
    const range = getPresetRange(preset);
    if (
      toDateInputValue(range.issuedFrom) === from &&
      toDateInputValue(range.issuedTo) === to
    ) {
      return preset;
    }
  }
  return 'custom';
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('issued_from');
  const toParam = searchParams.get('issued_to');

  const activePreset = getActivePreset(fromParam, toParam);

  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(fromParam ?? '');
  const [customTo, setCustomTo] = useState(toParam ?? '');
  const [showCustom, setShowCustom] = useState(activePreset === 'custom');

  function applyRange(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('issued_from', from);
    params.set('issued_to', to);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function handlePreset(preset: DatePreset) {
    const range = getPresetRange(preset);
    setShowCustom(false);
    applyRange(toDateInputValue(range.issuedFrom), toDateInputValue(range.issuedTo));
  }

  function handleCustomApply() {
    if (!customFrom || !customTo || customTo < customFrom) return;
    applyRange(customFrom, customTo);
  }

  const label =
    activePreset !== 'custom'
      ? DATE_PRESET_LABELS[activePreset]
      : fromParam && toParam
        ? `${fromParam} — ${toParam}`
        : 'Rango personalizado';

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CalendarDays className="size-4 shrink-0" />
        <span>{label}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="py-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                    activePreset === preset
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {DATE_PRESET_LABELS[preset]}
                </button>
              ))}

              <div className="mx-3 my-1 h-px bg-border" />

              <button
                onClick={() => setShowCustom((v) => !v)}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                  showCustom || activePreset === 'custom'
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                Rango personalizado
              </button>

              {showCustom && (
                <div className="px-4 pb-3 pt-1 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!customFrom || !customTo || customTo < customFrom}
                    onClick={handleCustomApply}
                  >
                    Aplicar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
