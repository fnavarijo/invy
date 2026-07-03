'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { LimitSelector } from '@/components/tables/limit-selector';
import {
  PRODUCTS_LIMIT_OPTIONS,
  type ProductsLimitOption,
} from './products-limit-options';

export function ProductsLimitSelector({ current }: { current: ProductsLimitOption }) {
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
      options={PRODUCTS_LIMIT_OPTIONS}
      current={current}
      onLimitSelect={handleLimitSelect}
    />
  );
}
