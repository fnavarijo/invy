'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { LimitSelector } from '@/components/tables/limit-selector';
import {
  INVOICE_LIMIT_OPTIONS,
  type InvoiceLimitOption,
} from './invoice-limit-options';

export function InvoiceLimitSelector({ current }: { current: InvoiceLimitOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleLimitSelect(limit: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(limit));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <LimitSelector
      options={INVOICE_LIMIT_OPTIONS}
      current={current}
      onLimitSelect={handleLimitSelect}
    />
  );
}
